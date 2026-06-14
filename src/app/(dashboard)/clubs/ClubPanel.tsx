'use client'

import { useState, useEffect, useRef } from 'react'
import type { ClubRow } from './ClubsClient'
import ClubRequestCard from './ClubRequestCard'
import { sortLevels, DEFAULT_LEVELS, SUGGESTED_LEVELS } from './TeamPicker'

const PROPOSAL_STATUSES = [
  { value: 'proposed',      label: 'Proposed',       color: '#6c8fff', bg: 'rgba(108,143,255,0.1)',  border: 'rgba(108,143,255,0.3)'  },
  { value: 'in_discussion', label: 'In Discussion',  color: '#ff9f43', bg: 'rgba(255,159,67,0.1)',   border: 'rgba(255,159,67,0.3)'   },
  { value: 'offer',         label: 'Offer',          color: '#00c896', bg: 'rgba(0,200,150,0.1)',    border: 'rgba(0,200,150,0.3)'    },
  { value: 'signed',        label: 'Signed',         color: '#00c896', bg: 'rgba(0,200,150,0.15)',   border: 'rgba(0,200,150,0.5)'    },
  { value: 'rejected',      label: 'Rejected',       color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)'    },
]

interface TeamContact {
  id: string
  teamLevel: string
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
}

interface FullRequest {
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

interface FullClub extends Omit<ClubRow, 'teamLevels' | 'requests'> {
  teamLevels: string[]
  teamContacts: TeamContact[]
  requests: FullRequest[]
}

export default function ClubPanel({
  club: initialClub,
  initialLevel,
  onClubUpdated,
  onClubDeleted,
  onRequestCountChange,
}: {
  club: ClubRow
  initialLevel?: string | null
  onClubUpdated: (c: ClubRow) => void
  onClubDeleted: (id: string) => void
  onRequestCountChange: (clubId: string, delta: number, teamLevel?: string | null) => void
}) {
  const [club, setClub] = useState<FullClub | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(initialLevel ?? null)
  const [proposalStatusFilter, setProposalStatusFilter] = useState<string | null>(null)

  // Request filters
  const [filterPosition, setFilterPosition] = useState('')
  const [filterTransferType, setFilterTransferType] = useState('')
  const [filterNationality, setFilterNationality] = useState('')
  const [filterAgeMin, setFilterAgeMin] = useState('')
  const [filterAgeMax, setFilterAgeMax] = useState('')
  const [filterBudgetMax, setFilterBudgetMax] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // Modals
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: initialClub.name, country: initialClub.country ?? '', contactName: initialClub.contactName ?? '', contactPhone: initialClub.contactPhone ?? '', contactEmail: initialClub.contactEmail ?? '', notes: initialClub.notes ?? '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Team management modal
  const [manageTeamsOpen, setManageTeamsOpen] = useState(false)

  // Contact form
  const [contactEditLevel, setContactEditLevel] = useState<string | null>(null)
  const [contactForm, setContactForm] = useState({ contactName: '', contactPhone: '', contactEmail: '' })
  const [savingContact, setSavingContact] = useState(false)

  // New request modal
  const [addReqOpen, setAddReqOpen] = useState(false)
  const [reqForm, setReqForm] = useState({ teamLevel: '', position: '', ageMin: '', ageMax: '', budget: '', transferType: '', nationality: '', notes: '' })
  const [reqTeamLevels, setReqTeamLevels] = useState<string[]>([])
  const [addingReq, setAddingReq] = useState(false)

  // Error toast
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showError(msg: string) {
    if (errorTimer.current) clearTimeout(errorTimer.current)
    setErrorMsg(msg)
    errorTimer.current = setTimeout(() => setErrorMsg(null), 3500)
  }

  useEffect(() => {
    setLoading(true)
    fetch(`/api/clubs/${initialClub.id}`)
      .then(r => { if (!r.ok) throw new Error('Failed to load club'); return r.json() })
      .then(d => {
        const c = d.club as FullClub
        c.teamLevels = (c.teamLevels as unknown as string[] | null) ?? []
        setClub(c)
        if (initialLevel && c.teamLevels.includes(initialLevel)) setSelectedLevel(initialLevel)
      })
      .catch(() => showError('Could not load club data. Please try again.'))
      .finally(() => setLoading(false))
  }, [initialClub.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed ──────────────────────────────────────────────────────────────
  // Fall back to defaults for clubs that haven't had teamLevels saved yet
  const teamLevels: string[] = (club?.teamLevels && club.teamLevels.length > 0)
    ? club.teamLevels
    : DEFAULT_LEVELS
  const openRequests = club?.requests.filter(r => r.status === 'open') ?? []
  const closedRequests = club?.requests.filter(r => r.status === 'closed') ?? []

  function applyRequestFilters(reqs: FullRequest[]) {
    return reqs
      .filter(r => !filterPosition || (r.position ?? '').toLowerCase().includes(filterPosition.toLowerCase()))
      .filter(r => !filterTransferType || r.transferType === filterTransferType)
      .filter(r => !filterNationality || (r.nationality ?? '').toLowerCase().includes(filterNationality.toLowerCase()))
      .filter(r => !filterAgeMin || (r.ageMax == null || r.ageMax >= parseInt(filterAgeMin)))
      .filter(r => !filterAgeMax || (r.ageMin == null || r.ageMin <= parseInt(filterAgeMax)))
      .filter(r => !filterBudgetMax || (r.budget != null && r.budget <= parseFloat(filterBudgetMax) * 1000))
      .filter(r => !filterDateFrom || new Date(r.createdAt) >= new Date(filterDateFrom))
      .filter(r => !filterDateTo   || new Date(r.createdAt) <= new Date(filterDateTo + 'T23:59:59'))
      .filter(r => !proposalStatusFilter || r.proposals.some(p => p.status === proposalStatusFilter))
  }

  const filteredOpen = applyRequestFilters(
    selectedLevel ? openRequests.filter(r => r.teamLevel === selectedLevel) : openRequests
  )
  const filteredClosed = applyRequestFilters(
    selectedLevel ? closedRequests.filter(r => r.teamLevel === selectedLevel) : closedRequests
  )

  // Group open requests by teamLevel for "All" view
  const groupedOpen = selectedLevel ? null : groupByLevel(filteredOpen, teamLevels)

  function groupByLevel(reqs: FullRequest[], levels: string[]): { level: string | null; requests: FullRequest[] }[] {
    const groups: { level: string | null; requests: FullRequest[] }[] = []
    const used = new Set<string | null>()
    // First: requests with a known teamLevel in order
    for (const level of levels) {
      const matching = reqs.filter(r => r.teamLevel === level)
      if (matching.length > 0) { groups.push({ level, requests: matching }); used.add(level) }
    }
    // Then: requests with unknown/no teamLevel
    const unassigned = reqs.filter(r => !r.teamLevel || !used.has(r.teamLevel))
    if (unassigned.length > 0) groups.push({ level: null, requests: unassigned })
    return groups
  }

  const currentContact = selectedLevel
    ? (club?.teamContacts.find(c => c.teamLevel === selectedLevel) ?? null)
    : null

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSaveEdit() {
    setSaving(true)
    try {
      const res = await fetch(`/api/clubs/${initialClub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) { showError('Failed to save club details.'); return }
      const { club: updated } = await res.json() as { club: ClubRow }
      setClub(prev => prev ? { ...prev, name: updated.name, country: updated.country, contactName: updated.contactName, contactPhone: updated.contactPhone, contactEmail: updated.contactEmail, notes: updated.notes } : null)
      onClubUpdated({ ...initialClub, ...updated })
      setEditOpen(false)
    } catch { showError('Failed to save club details.')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/clubs/${initialClub.id}`, { method: 'DELETE' })
    onClubDeleted(initialClub.id)
  }

  async function saveTeamLevels(levels: string[]) {
    const res = await fetch(`/api/clubs/${initialClub.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamLevels: levels }),
    })
    if (!res.ok) return
    setClub(prev => prev ? { ...prev, teamLevels: levels } : null)
    onClubUpdated({ ...initialClub, teamLevels: levels })
  }

  function openContactEdit(level: string) {
    const existing = club?.teamContacts.find(c => c.teamLevel === level)
    setContactForm({
      contactName: existing?.contactName ?? '',
      contactPhone: existing?.contactPhone ?? '',
      contactEmail: existing?.contactEmail ?? '',
    })
    setContactEditLevel(level)
  }

  async function handleSaveContact() {
    if (!contactEditLevel) return
    setSavingContact(true)
    try {
      const res = await fetch(`/api/clubs/${initialClub.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamLevel: contactEditLevel, ...contactForm }),
      })
      if (!res.ok) { showError('Failed to save contact.'); return }
      const { contact } = await res.json() as { contact: TeamContact }
      setClub(prev => {
        if (!prev) return null
        const others = prev.teamContacts.filter(c => c.teamLevel !== contactEditLevel)
        return { ...prev, teamContacts: [...others, contact] }
      })
      setContactEditLevel(null)
    } catch { showError('Failed to save contact.')
    } finally { setSavingContact(false) }
  }

  async function handleAddRequest() {
    setAddingReq(true)
    try {
      // When predefined levels exist, create one request per selected team.
      // If nothing selected, create one request with no team level.
      const hasPredefinedLevels = teamLevels.length > 0
      const teamsToCreate: (string | null)[] = hasPredefinedLevels
        ? (reqTeamLevels.length > 0 ? reqTeamLevels : [null])
        : [reqForm.teamLevel || null]

      const newRequests: FullRequest[] = []
      for (const teamLevel of teamsToCreate) {
        const res = await fetch(`/api/clubs/${initialClub.id}/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...reqForm, teamLevel }),
        })
        if (!res.ok) { showError('Failed to add request.'); return }
        const { request } = await res.json() as { request: FullRequest }
        newRequests.push(request)
      }

      setClub(prev => prev ? { ...prev, requests: [...newRequests, ...prev.requests] } : null)
      for (const req of newRequests) onRequestCountChange(initialClub.id, 1, req.teamLevel)
      setAddReqOpen(false)
      setReqForm({ teamLevel: selectedLevel ?? '', position: '', ageMin: '', ageMax: '', budget: '', transferType: '', nationality: '', notes: '' })
      setReqTeamLevels(selectedLevel ? [selectedLevel] : [])
    } catch { showError('Failed to add request.')
    } finally { setAddingReq(false) }
  }

  function handleRequestUpdated(updated: FullRequest) {
    setClub(prev => prev ? { ...prev, requests: prev.requests.map(r => r.id === updated.id ? updated : r) } : null)
    if (updated.status === 'closed') onRequestCountChange(initialClub.id, -1, updated.teamLevel)
  }

  function handleRequestDeleted(id: string) {
    setClub(prev => {
      if (!prev) return null
      const req = prev.requests.find(r => r.id === id)
      if (req?.status === 'open') onRequestCountChange(initialClub.id, -1, req.teamLevel)
      return { ...prev, requests: prev.requests.filter(r => r.id !== id) }
    })
  }

  function openNewRequest() {
    setReqForm({ teamLevel: selectedLevel ?? '', position: '', ageMin: '', ageMax: '', budget: '', transferType: '', nationality: '', notes: '' })
    setReqTeamLevels(selectedLevel ? [selectedLevel] : [])
    setAddReqOpen(true)
  }

  const displayClub = club ?? initialClub

  return (
    <div className="flex flex-col gap-4">

      {/* Club header */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, #6c8fff, #5a7aff)' }} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{displayClub.name}</h2>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                {displayClub.country && <span>🌍 {displayClub.country}</span>}
                {displayClub.contactName && <span>👤 {displayClub.contactName}</span>}
                {displayClub.contactPhone && <span>📞 {displayClub.contactPhone}</span>}
                {displayClub.contactEmail && <span>✉ {displayClub.contactEmail}</span>}
              </div>
              {displayClub.notes && (
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{displayClub.notes}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                Edit
              </button>
              <button onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Team pills row */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
        <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
          <button
            onClick={() => setSelectedLevel(null)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={!selectedLevel
              ? { background: '#6c8fff', color: '#fff', border: '1px solid #6c8fff' }
              : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >All</button>

          {teamLevels.map(level => {
            const active = selectedLevel === level
            const count = openRequests.filter(r => r.teamLevel === level).length
            return (
              <button key={level} onClick={() => setSelectedLevel(level)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={active
                  ? { background: '#6c8fff', color: '#fff', border: '1px solid #6c8fff' }
                  : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {level}{count > 0 && <span className="ml-1.5 text-[10px] opacity-70">{count}</span>}
              </button>
            )
          })}

          {/* Manage Teams settings button */}
          <button onClick={() => setManageTeamsOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ml-auto"
            style={{ background: 'transparent', color: 'var(--text-faint)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#6c8fff'; e.currentTarget.style.borderColor = 'rgba(108,143,255,0.4)'; e.currentTarget.style.background = 'rgba(108,143,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
            Manage Teams
          </button>
        </div>

        {/* ── REQUESTS filter row ── */}
        <div className="flex items-center gap-3 flex-wrap px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
          <span className="text-[10px] uppercase font-bold flex-shrink-0" style={{ color: '#6c8fff', letterSpacing: '0.7px' }}>Requests</span>

          {/* Position */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Position</span>
            <input type="text" value={filterPosition} onChange={e => setFilterPosition(e.target.value)}
              placeholder="any…"
              className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
              style={{ background: 'var(--input-bg)', border: filterPosition ? '1px solid #6c8fff' : '1px solid var(--input-border)', color: 'var(--text-primary)', width: 80 }} />
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
            <input type="text" value={filterNationality} onChange={e => setFilterNationality(e.target.value)}
              placeholder="any…"
              className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
              style={{ background: 'var(--input-bg)', border: filterNationality ? '1px solid #6c8fff' : '1px solid var(--input-border)', color: 'var(--text-primary)', width: 80 }} />
          </div>

          <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

          {/* Age range */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Age</span>
            <input type="number" value={filterAgeMin} onChange={e => setFilterAgeMin(e.target.value)}
              placeholder="min"
              className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
              style={{ background: 'var(--input-bg)', border: filterAgeMin ? '1px solid #6c8fff' : '1px solid var(--input-border)', color: 'var(--text-primary)', width: 50 }} />
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>–</span>
            <input type="number" value={filterAgeMax} onChange={e => setFilterAgeMax(e.target.value)}
              placeholder="max"
              className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
              style={{ background: 'var(--input-bg)', border: filterAgeMax ? '1px solid #6c8fff' : '1px solid var(--input-border)', color: 'var(--text-primary)', width: 50 }} />
          </div>

          <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

          {/* Budget max */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Budget ≤</span>
            <input type="number" value={filterBudgetMax} onChange={e => setFilterBudgetMax(e.target.value)}
              placeholder="K€/yr"
              className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
              style={{ background: 'var(--input-bg)', border: filterBudgetMax ? '1px solid #6c8fff' : '1px solid var(--input-border)', color: 'var(--text-primary)', width: 70 }} />
          </div>

          <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Date</span>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
              style={{ background: 'var(--input-bg)', border: filterDateFrom ? '1px solid #6c8fff' : '1px solid var(--input-border)', color: 'var(--text-primary)', width: 120 }} />
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>–</span>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
              style={{ background: 'var(--input-bg)', border: filterDateTo ? '1px solid #6c8fff' : '1px solid var(--input-border)', color: 'var(--text-primary)', width: 120 }} />
          </div>

          {/* Reset */}
          {(filterPosition || filterTransferType || filterNationality || filterAgeMin || filterAgeMax || filterBudgetMax || filterDateFrom || filterDateTo || proposalStatusFilter) && (
            <button
              onClick={() => { setFilterPosition(''); setFilterTransferType(''); setFilterNationality(''); setFilterAgeMin(''); setFilterAgeMax(''); setFilterBudgetMax(''); setFilterDateFrom(''); setFilterDateTo(''); setProposalStatusFilter(null) }}
              className="ml-auto text-[11px] px-2 py-0.5 rounded-lg transition-all"
              style={{ color: 'var(--text-faint)', background: 'transparent', border: '1px solid var(--border)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--hover-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent' }}>
              Reset
            </button>
          )}
        </div>

        {/* ── PROPOSALS filter row ── */}
        <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
          <span className="text-[10px] uppercase font-bold flex-shrink-0" style={{ color: '#00c896', letterSpacing: '0.7px' }}>Proposals</span>
          <button onClick={() => setProposalStatusFilter(null)}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all"
            style={!proposalStatusFilter
              ? { background: '#6c8fff', color: '#fff', border: '1px solid #6c8fff' }
              : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            All
          </button>
          {PROPOSAL_STATUSES.map(({ value, label, color, bg, border }) => {
            const count = openRequests.filter(r => r.proposals.some(p => p.status === value)).length
            const active = proposalStatusFilter === value
            return (
              <button key={value} onClick={() => setProposalStatusFilter(active ? null : value)}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all"
                style={active
                  ? { background: bg, color, border: `1px solid ${border}` }
                  : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {label}{count > 0 && <span className="ml-1 text-[10px] opacity-60">{count}</span>}
              </button>
            )
          })}
        </div>

        {/* Team contact card — only when a specific level is selected */}
        {selectedLevel && (
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(108,143,255,0.1)', border: '1px solid rgba(108,143,255,0.2)' }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#6c8fff">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                {currentContact ? (
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{currentContact.contactName || '—'}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {currentContact.contactPhone && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>📞 {currentContact.contactPhone}</span>}
                      {currentContact.contactEmail && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>✉ {currentContact.contactEmail}</span>}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>No contact for {selectedLevel} yet</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openContactEdit(selectedLevel)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                  {currentContact ? 'Edit' : '+ Add Contact'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Requests section */}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#6c8fff' }}>
              Open Requests
              {filteredOpen.length > 0 && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(108,143,255,0.15)', color: '#6c8fff' }}>
                  {filteredOpen.length}
                </span>
              )}
            </p>
            <button onClick={openNewRequest}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aff)', color: '#fff', boxShadow: '0 2px 8px rgba(108,143,255,0.25)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(108,143,255,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(108,143,255,0.25)' }}>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              New Request
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-4">
              <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#6c8fff', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
            </div>
          ) : filteredOpen.length === 0 ? (
            <div className="rounded-xl flex flex-col items-center justify-center text-center py-8 px-4"
              style={{ background: 'var(--subtle-bg)', border: '1px dashed rgba(108,143,255,0.25)' }}>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No open requests</p>
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                {selectedLevel ? `No ${selectedLevel} requests yet.` : 'Add a request to start matching players.'}
              </p>
            </div>
          ) : selectedLevel ? (
            // Filtered view — flat list
            filteredOpen.map(req => (
              <ClubRequestCard key={req.id} request={req} clubId={initialClub.id} clubName={displayClub.name}
                teamLevels={teamLevels}
                onUpdated={handleRequestUpdated} onDeleted={handleRequestDeleted} />
            ))
          ) : (
            // All view — grouped by team level
            groupedOpen!.map(({ level, requests }) => (
              <div key={level ?? '__unassigned__'}>
                {level ? (
                  <p className="text-[10px] uppercase font-bold mb-2 pl-2 border-l-2"
                    style={{ letterSpacing: '0.8px', color: 'var(--text-muted)', borderColor: 'rgba(108,143,255,0.4)' }}>
                    {level}
                  </p>
                ) : teamLevels.length > 0 ? (
                  <p className="text-[10px] uppercase font-bold mb-2 pl-2 border-l-2"
                    style={{ letterSpacing: '0.8px', color: 'var(--text-faint)', borderColor: 'var(--border-strong)' }}>
                    Unassigned
                  </p>
                ) : null}
                <div className="flex flex-col gap-2">
                  {requests.map(req => (
                    <ClubRequestCard key={req.id} request={req} clubId={initialClub.id} clubName={displayClub.name}
                      teamLevels={teamLevels}
                      onUpdated={handleRequestUpdated} onDeleted={handleRequestDeleted} />
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Closed requests */}
          {filteredClosed.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] uppercase font-bold mb-2 pl-2 border-l-2"
                style={{ letterSpacing: '0.9px', color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}>
                Closed ({filteredClosed.length})
              </p>
              <div className="flex flex-col gap-2" style={{ opacity: 0.6 }}>
                {filteredClosed.map(req => (
                  <ClubRequestCard key={req.id} request={req} clubId={initialClub.id} clubName={displayClub.name}
                    teamLevels={teamLevels}
                    onUpdated={handleRequestUpdated} onDeleted={handleRequestDeleted} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Edit club */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setEditOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #6c8fff, #5a7aff)' }} />
            <div className="p-6">
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Edit Club</h2>
              <div className="flex flex-col gap-3 mb-5">
                {(['name', 'country', 'contactName', 'contactPhone', 'contactEmail'] as const).map(field => (
                  <div key={field}>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                      {field === 'name' ? 'Club Name *' : field === 'contactName' ? 'Contact Name' : field === 'contactPhone' ? 'Phone' : field === 'contactEmail' ? 'Email' : 'Country'}
                    </label>
                    <input type="text" value={editForm[field]} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
                  <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2} className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none resize-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
                </div>
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => setEditOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving || !editForm.name.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aff)', color: '#fff' }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => !deleting && setDeleteConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #ef4444, #dc2626)' }} />
            <div className="p-6">
              <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Delete Club</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Delete <strong style={{ color: 'var(--text-primary)' }}>{displayClub.name}</strong> and all its requests?</p>
              <div className="flex gap-2.5">
                <button onClick={() => setDeleteConfirm(false)} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff' }}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Request modal */}
      {addReqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setAddReqOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #6c8fff, #5a7aff)' }} />
            <div className="p-6">
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                New Request
                <span style={{ color: '#6c8fff' }}> — {displayClub.name}</span>
              </h2>
              <div className="flex flex-col gap-3 mb-5">
                {/* Team Level */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Team</label>
                    {teamLevels.length > 0 && reqTeamLevels.length > 0 && (
                      <span className="text-[10px]" style={{ color: '#6c8fff' }}>
                        {reqTeamLevels.length} selected
                      </span>
                    )}
                  </div>
                  {teamLevels.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {teamLevels.map(l => {
                        const active = reqTeamLevels.includes(l)
                        return (
                          <button key={l}
                            onClick={() => setReqTeamLevels(prev => active ? prev.filter(x => x !== l) : [...prev, l])}
                            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                            style={active
                              ? { background: 'rgba(108,143,255,0.18)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.5)' }
                              : { background: 'var(--subtle-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                            {l}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <input type="text" value={reqForm.teamLevel} onChange={e => setReqForm(f => ({ ...f, teamLevel: e.target.value }))}
                      placeholder="e.g. First Team, U18…"
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
                  )}
                </div>

                <ReqField label="Position" value={reqForm.position} onChange={v => setReqForm(f => ({ ...f, position: v }))} placeholder="e.g. Striker, Centre-Back" />
                <div className="grid grid-cols-2 gap-3">
                  <ReqField label="Min Age" value={reqForm.ageMin} onChange={v => setReqForm(f => ({ ...f, ageMin: v }))} placeholder="e.g. 18" type="number" />
                  <ReqField label="Max Age" value={reqForm.ageMax} onChange={v => setReqForm(f => ({ ...f, ageMax: v }))} placeholder="e.g. 28" type="number" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Transfer Type</label>
                  <div className="flex gap-2">
                    {(['buy', 'loan', 'free'] as const).map(t => (
                      <button key={t} onClick={() => setReqForm(f => ({ ...f, transferType: f.transferType === t ? '' : t }))}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                        style={reqForm.transferType === t
                          ? { background: 'rgba(108,143,255,0.15)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.4)' }
                          : { background: 'var(--subtle-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <ReqField label="Budget (€/year)" value={reqForm.budget} onChange={v => setReqForm(f => ({ ...f, budget: v }))} placeholder="e.g. 200000" type="number" />
                <ReqField label="Nationality" value={reqForm.nationality} onChange={v => setReqForm(f => ({ ...f, nationality: v }))} placeholder="e.g. Israeli, French" />
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
                  <textarea value={reqForm.notes} onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2} placeholder="Any additional requirements…"
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none resize-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
                </div>
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => setAddReqOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Cancel</button>
                <button onClick={handleAddRequest} disabled={addingReq} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aff)', color: '#fff' }}>
                  {addingReq ? 'Adding…' : reqTeamLevels.length > 1 ? `Add ${reqTeamLevels.length} Requests` : 'Add Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact edit modal */}
      {contactEditLevel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setContactEditLevel(null)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #6c8fff, #5a7aff)' }} />
            <div className="p-6">
              <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{contactEditLevel} Contact</h2>
              <p className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>Contact person for the {contactEditLevel} team</p>
              <div className="flex flex-col gap-3 mb-5">
                {([['contactName', 'Name'], ['contactPhone', 'Phone'], ['contactEmail', 'Email']] as const).map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
                    <input type="text" value={contactForm[field]}
                      onChange={e => setContactForm(f => ({ ...f, [field]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => setContactEditLevel(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Cancel</button>
                <button onClick={handleSaveContact} disabled={savingContact} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aff)', color: '#fff' }}>
                  {savingContact ? 'Saving…' : 'Save Contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Teams modal */}
      {manageTeamsOpen && (
        <ManageTeamsModal
          current={teamLevels}
          onSave={async (levels) => { await saveTeamLevels(levels); setManageTeamsOpen(false) }}
          onClose={() => setManageTeamsOpen(false)}
          clubName={displayClub.name}
        />
      )}

      {/* Error toast */}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%',
        transform: `translateX(-50%) translateY(${errorMsg ? 0 : 16}px)`,
        opacity: errorMsg ? 1 : 0,
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        zIndex: 200, pointerEvents: 'none',
      }}>
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-medium"
          style={{ background: 'var(--card-bg)', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--text-primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)' }}>
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="#ef4444"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </div>
          <span>{errorMsg}</span>
        </div>
      </div>
    </div>
  )
}

// ── Manage Teams Modal ────────────────────────────────────────────────────────

function ManageTeamsModal({ current, onSave, onClose, clubName }: {
  current: string[]
  onSave: (levels: string[]) => Promise<void>
  onClose: () => void
  clubName: string
}) {
  const [draft, setDraft] = useState<string[]>([...current])
  const [customInput, setCustomInput] = useState('')
  const [saving, setSaving] = useState(false)

  function addCustom() {
    const val = customInput.trim()
    if (!val || draft.includes(val)) return
    setDraft(prev => sortLevels([...prev, val]))
    setCustomInput('')
  }

  async function handleSave() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
  }

  const allSuggested = SUGGESTED_LEVELS.flat()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, #6c8fff, #5a7aff)' }} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(108,143,255,0.1)', border: '1px solid rgba(108,143,255,0.25)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#6c8fff">
                <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Manage Teams</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{clubName}</p>
            </div>
          </div>

          {/* Current teams — each removable */}
          <div className="mb-4">
            <p className="text-[10px] uppercase font-bold mb-2 pl-2 border-l-2"
              style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#6c8fff' }}>
              Active Teams
            </p>
            <div className="flex flex-wrap gap-1.5">
              {draft.map(level => (
                <span key={level} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(108,143,255,0.12)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.3)' }}>
                  {level}
                  <button
                    onClick={() => setDraft(prev => prev.filter(l => l !== level))}
                    className="opacity-50 hover:opacity-100 transition-opacity ml-0.5 text-[10px]">✕</button>
                </span>
              ))}
              {draft.length === 0 && (
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>No teams — add from the list below.</p>
              )}
            </div>
          </div>

          {/* Removed suggested levels — quick re-add */}
          {allSuggested.filter(l => !draft.includes(l)).length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] uppercase font-bold mb-2 pl-2 border-l-2"
                style={{ letterSpacing: '0.9px', color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}>
                Add Back
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allSuggested.filter(l => !draft.includes(l)).map(level => (
                  <button key={level}
                    onClick={() => setDraft(prev => sortLevels([...prev, level]))}
                    className="text-[11px] px-2 py-0.5 rounded-full font-medium transition-all"
                    style={{ background: 'var(--subtle-bg)', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,143,255,0.08)'; e.currentTarget.style.color = '#6c8fff'; e.currentTarget.style.borderColor = 'rgba(108,143,255,0.3)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--subtle-bg)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                    + {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom name input */}
          <div className="flex gap-2 mb-5">
            <input type="text" value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
              placeholder="Custom team name…"
              className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
            <button onClick={addCustom} disabled={!customInput.trim()}
              className="px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
              style={{ background: 'rgba(108,143,255,0.1)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.3)' }}>
              + Add
            </button>
          </div>

          <div className="flex gap-2.5">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aff)', color: '#fff', boxShadow: '0 2px 12px rgba(108,143,255,0.25)' }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,143,255,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(108,143,255,0.25)' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReqField({ label, value, onChange, placeholder, type = 'text' }: {
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
