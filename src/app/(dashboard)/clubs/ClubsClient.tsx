'use client'

import { useState, useMemo } from 'react'
import ClubPanel from './ClubPanel'
import AllRequestsView from './AllRequestsView'
import { TeamPicker, sortLevels, DEFAULT_LEVELS } from './TeamPicker'

export interface ClubRow {
  id: string
  name: string
  country: string | null
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  notes: string | null
  logoUrl: string | null
  teamLevels: string[] | null
  createdAt: Date | string
  requests: { id: string; teamLevel: string | null }[]
}

export default function ClubsClient({ initialClubs }: { initialClubs: ClubRow[] }) {
  const [clubs, setClubs] = useState<ClubRow[]>(initialClubs)
  const [selectedId, setSelectedId] = useState<string | null>(clubs[0]?.id ?? null)
  const [search, setSearch] = useState('')
  const [activeLevel, setActiveLevel] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'clubs' | 'requests'>('clubs')

  // Add Club modal
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addCountry, setAddCountry] = useState('')
  const [addTeamLevels, setAddTeamLevels] = useState<string[]>(['First Team'])
  const [addCustomTeams, setAddCustomTeams] = useState<string[]>([])
  const [addCustomInput, setAddCustomInput] = useState('')
  const [adding, setAdding] = useState(false)

  const selected = clubs.find(c => c.id === selectedId) ?? null

  // All levels that have at least one open request across all clubs — for the left panel filter
  const availableLevels = useMemo(() => {
    const levels = new Set<string>()
    clubs.forEach(c => c.requests.forEach(r => { if (r.teamLevel) levels.add(r.teamLevel) }))
    return sortLevels([...levels])
  }, [clubs])

  // Filter clubs by search + active level
  const filtered = useMemo(() => {
    let list = clubs
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.country ?? '').toLowerCase().includes(q))
    }
    if (activeLevel) {
      list = list.filter(c => c.requests.some(r => r.teamLevel === activeLevel))
    }
    return list
  }, [clubs, search, activeLevel])

  // Request count badge: if level filter active, count only matching requests
  function requestCount(club: ClubRow) {
    if (activeLevel) return club.requests.filter(r => r.teamLevel === activeLevel).length
    return club.requests.length
  }

  async function handleAdd() {
    if (!addName.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          country: addCountry.trim() || null,
          teamLevels: addTeamLevels,
        }),
      })
      if (!res.ok) return
      const { club } = await res.json() as { club: ClubRow }
      setClubs(prev => [...prev, club].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedId(club.id)
      setAddOpen(false)
      setAddName('')
      setAddCountry('')
      setAddTeamLevels(['First Team'])
      setAddCustomTeams([])
    } finally {
      setAdding(false)
    }
  }

  function addCustomTeam() {
    const val = addCustomInput.trim()
    if (!val || addCustomTeams.includes(val) || DEFAULT_LEVELS.includes(val)) return
    setAddCustomTeams(prev => [...prev, val])
    setAddTeamLevels(prev => sortLevels([...prev, val]))
    setAddCustomInput('')
  }

  function closeAddModal() {
    setAddOpen(false)
    setAddName('')
    setAddCountry('')
    setAddTeamLevels(['First Team'])
    setAddCustomTeams([])
    setAddCustomInput('')
  }

  function handleClubUpdated(updated: ClubRow) {
    setClubs(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  function handleClubDeleted(id: string) {
    setClubs(prev => {
      const remaining = prev.filter(c => c.id !== id)
      if (selectedId === id) setSelectedId(remaining[0]?.id ?? null)
      return remaining
    })
  }

  function handleRequestCountChange(clubId: string, delta: number, teamLevel?: string | null) {
    setClubs(prev => prev.map(c => {
      if (c.id !== clubId) return c
      if (delta > 0) return { ...c, requests: [...c.requests, { id: 'tmp', teamLevel: teamLevel ?? null }] }
      if (teamLevel) return { ...c, requests: c.requests.filter((r, i) => !(r.teamLevel === teamLevel && i === c.requests.findLastIndex(x => x.teamLevel === teamLevel))) }
      return { ...c, requests: c.requests.slice(0, -1) }
    }))
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="mr-auto pl-3 border-l-2" style={{ borderColor: '#6c8fff' }}>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Clubs</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
            <span style={{ color: '#6c8fff' }}>{clubs.length}</span> club{clubs.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Split layout */}
      <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 110px)', alignItems: 'flex-start' }}>

        {/* ── Left panel ── */}
        <div style={{ width: 260, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Add Club button */}
            <div className="px-3 pt-3 pb-2 flex-shrink-0">
              <button
                onClick={() => setAddOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aff)', color: '#fff', boxShadow: '0 2px 8px rgba(108,143,255,0.25)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(108,143,255,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(108,143,255,0.25)' }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                Add Club
              </button>
            </div>

            {/* Level filter pills */}
            {availableLevels.length > 0 && (
              <div className="px-3 pb-2 flex-shrink-0 flex flex-wrap gap-1">
                <button
                  onClick={() => setActiveLevel(null)}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all"
                  style={!activeLevel
                    ? { background: '#6c8fff', color: '#fff', border: '1px solid #6c8fff' }
                    : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  All
                </button>
                {availableLevels.map(level => (
                  <button
                    key={level}
                    onClick={() => setActiveLevel(activeLevel === level ? null : level)}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all"
                    style={activeLevel === level
                      ? { background: '#6c8fff', color: '#fff', border: '1px solid #6c8fff' }
                      : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="px-3 pb-2.5 border-b flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
              <div className="relative flex items-center">
                <svg className="absolute left-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-faint)' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search clubs…"
                  className="w-full pl-8 py-1.5 rounded-lg text-sm focus:outline-none transition-colors"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', paddingRight: search ? 28 : 12 }}
                  onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 flex items-center justify-center w-4 h-4 rounded"
                    style={{ color: 'var(--text-faint)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-faint)' }}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  </button>
                )}
              </div>
            </div>

            {/* Club list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {clubs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center px-5 py-12">
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No clubs yet</p>
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Click "Add Club" to get started.</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>No clubs match your filters.</p>
                </div>
              ) : (
                filtered.map((club, i) => {
                  const active = club.id === selectedId
                  const count = requestCount(club)
                  return (
                    <button
                      key={club.id}
                      onClick={() => setSelectedId(club.id)}
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                        background: active ? 'rgba(108,143,255,0.06)' : 'transparent',
                        boxShadow: active ? 'inset 3px 0 0 #6c8fff' : 'none',
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover-bg)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold truncate" style={{ color: active ? '#6c8fff' : 'var(--text-primary)' }}>
                          {club.name}
                        </span>
                        {count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                            style={{ background: 'rgba(108,143,255,0.15)', color: '#6c8fff' }}>
                            {count}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {club.country && <p className="text-[11px] truncate" style={{ color: 'var(--text-faint)' }}>{club.country}</p>}
                        {(club.teamLevels as string[] | null)?.length ? (
                          <p className="text-[10px] truncate" style={{ color: 'rgba(108,143,255,0.6)' }}>
                            {(club.teamLevels as string[]).slice(0, 3).join(' · ')}{(club.teamLevels as string[]).length > 3 ? ' …' : ''}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ flexShrink: 0, width: 3, alignSelf: 'stretch', background: 'var(--border-strong)', margin: '0 12px', borderRadius: 2 }} />

        {/* ── Right panel ── */}
        <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* View toggle */}
          <div className="flex items-center gap-4 mb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
            <button
              onClick={() => setViewMode('clubs')}
              className="px-1 pb-2 text-sm font-semibold transition-all"
              style={viewMode === 'clubs'
                ? { color: '#6c8fff', borderBottom: '2px solid #6c8fff', marginBottom: -9 }
                : { color: 'var(--text-muted)', borderBottom: '2px solid transparent', marginBottom: -9 }}>
              Club Requests
            </button>
            <button
              onClick={() => setViewMode('requests')}
              className="px-1 pb-2 text-sm font-semibold transition-all"
              style={viewMode === 'requests'
                ? { color: '#6c8fff', borderBottom: '2px solid #6c8fff', marginBottom: -9 }
                : { color: 'var(--text-muted)', borderBottom: '2px solid transparent', marginBottom: -9 }}>
              All Clubs Requests
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {viewMode === 'requests' ? (
              <AllRequestsView clubs={clubs} />
            ) : selected ? (
              <ClubPanel
                key={`${selected.id}-${activeLevel ?? 'all'}`}
                club={selected}
                initialLevel={activeLevel}
                onClubUpdated={handleClubUpdated}
                onClubDeleted={handleClubDeleted}
                onRequestCountChange={handleRequestCountChange}
              />
            ) : (
              <div className="rounded-2xl flex flex-col items-center justify-center text-center h-full"
                style={{ background: 'var(--subtle-bg)', border: '1px dashed rgba(108,143,255,0.25)', minHeight: 300 }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(108,143,255,0.08)', border: '1px solid rgba(108,143,255,0.2)' }}>
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#6c8fff"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Select a club</p>
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Choose a club from the list to view its requests.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Club modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={closeAddModal}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #6c8fff, #5a7aff)' }} />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(108,143,255,0.1)', border: '1px solid rgba(108,143,255,0.25)' }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#6c8fff"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Add Club</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>Add a club you work with</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Club Name *</label>
                  <input autoFocus type="text" value={addName} onChange={e => setAddName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                    placeholder="e.g. Maccabi Tel Aviv"
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Country</label>
                  <input type="text" value={addCountry} onChange={e => setAddCountry(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                    placeholder="e.g. Israel"
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
                </div>

                {/* Team levels */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Teams - Age Group</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {DEFAULT_LEVELS.map(l => {
                      const enabled = addTeamLevels.includes(l)
                      const isFirst = l === 'First Team'
                      return (
                        <span key={l} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={enabled
                            ? { background: 'rgba(108,143,255,0.12)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.3)' }
                            : { background: 'var(--subtle-bg)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}>
                          {l}
                          {isFirst ? (
                            <svg className="w-2.5 h-2.5 ml-0.5 opacity-40 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                            </svg>
                          ) : (
                            <button
                              onClick={() => setAddTeamLevels(prev =>
                                enabled ? prev.filter(x => x !== l) : sortLevels([...prev, l])
                              )}
                              className="opacity-50 hover:opacity-100 transition-opacity ml-0.5 flex-shrink-0 leading-none">
                              {enabled ? '✕' : '+'}
                            </button>
                          )}
                        </span>
                      )
                    })}
                    {/* Custom teams */}
                    {addCustomTeams.map(l => {
                      const enabled = addTeamLevels.includes(l)
                      return (
                        <span key={l} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={enabled
                            ? { background: 'rgba(108,143,255,0.12)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.3)' }
                            : { background: 'var(--subtle-bg)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}>
                          {l}
                          <button
                            onClick={() => setAddTeamLevels(prev =>
                              enabled ? prev.filter(x => x !== l) : sortLevels([...prev, l])
                            )}
                            className="opacity-50 hover:opacity-100 transition-opacity ml-0.5 flex-shrink-0 leading-none">
                            {enabled ? '✕' : '+'}
                          </button>
                        </span>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={addCustomInput}
                      onChange={e => setAddCustomInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTeam() } }}
                      placeholder="Add custom team…"
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    />
                    <button onClick={addCustomTeam} disabled={!addCustomInput.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                      style={{ background: 'rgba(108,143,255,0.1)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.3)' }}>
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button onClick={closeAddModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                  Cancel
                </button>
                <button onClick={handleAdd} disabled={adding || !addName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aff)', color: '#fff', boxShadow: '0 2px 12px rgba(108,143,255,0.25)' }}
                  onMouseEnter={e => { if (!adding) e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,143,255,0.45)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(108,143,255,0.25)' }}>
                  {adding ? 'Adding…' : 'Add Club'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
