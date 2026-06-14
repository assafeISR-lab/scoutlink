'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Report {
  id: string
  name: string
  databaseName: string
  playerCount: number
  createdAt: string
}

interface ScoutReport {
  id: string
  updatedAt: string
  player: {
    id: string
    name: string
    position: string | null
    clubName: string | null
    databaseId: string
  }
}

export default function ReportsList({ reports: initial, scoutReports: initialScout }: { reports: Report[]; scoutReports: ScoutReport[] }) {
  const router = useRouter()
  const [reports, setReports] = useState(initial)
  const [scoutReports] = useState(initialScout)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Snapshots search state
  const [snapSearch, setSnapSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Scouting reports search + date state
  const [scoutSearch, setScoutSearch] = useState('')
  const [scoutDateFrom, setScoutDateFrom] = useState('')
  const [scoutDateTo, setScoutDateTo] = useState('')

  const filteredScout = useMemo(() => {
    const q = scoutSearch.trim().toLowerCase()
    return scoutReports.filter(r => {
      if (q && !r.player.name.toLowerCase().includes(q) && !(r.player.clubName ?? '').toLowerCase().includes(q)) return false
      if (scoutDateFrom && new Date(r.updatedAt) < new Date(scoutDateFrom)) return false
      if (scoutDateTo) {
        const to = new Date(scoutDateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(r.updatedAt) > to) return false
      }
      return true
    })
  }, [scoutReports, scoutSearch, scoutDateFrom, scoutDateTo])

  async function handleDelete(id: string) {
    setDeleting(id)
    setConfirmDeleteId(null)
    await fetch(`/api/reports/${id}`, { method: 'DELETE' })
    setReports(r => r.filter(x => x.id !== id))
    setDeleting(null)
    router.refresh()
  }

  function clearSnapFilters() {
    setSnapSearch('')
    setDateFrom('')
    setDateTo('')
  }

  const hasSnapFilters = snapSearch.trim() || dateFrom || dateTo

  const filteredSnaps = useMemo(() => {
    const q = snapSearch.trim().toLowerCase()
    return reports.filter(r => {
      if (q && !r.name.toLowerCase().includes(q) && !r.databaseName.toLowerCase().includes(q)) return false
      if (dateFrom && new Date(r.createdAt) < new Date(dateFrom)) return false
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(r.createdAt) > to) return false
      }
      return true
    })
  }, [reports, snapSearch, dateFrom, dateTo])

  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    color: 'var(--text-primary)',
    colorScheme: 'light',
  }

  return (
    <>
    <div className="grid grid-cols-2 gap-6 items-start">

      {/* ── Left: Scout Reports ── */}
      <div className="flex flex-col gap-4">
        {/* Section header */}
        <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,159,67,0.1)', border: '1px solid rgba(255,159,67,0.25)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#ff9f43">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Player Reports</h2>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Detailed per-player reports</p>
          </div>
        </div>

        {/* Search + date filters */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-faint)' }}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              value={scoutSearch}
              onChange={e => setScoutSearch(e.target.value)}
              placeholder="Search scouting reports…"
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = '#ff9f43'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>From</span>
            <input
              type="date"
              value={scoutDateFrom}
              onChange={e => setScoutDateFrom(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-sm focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = '#ff9f43'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
            />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>To</span>
            <input
              type="date"
              value={scoutDateTo}
              onChange={e => setScoutDateTo(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-sm focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = '#ff9f43'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
            />
            {(scoutSearch.trim() || scoutDateFrom || scoutDateTo) && (
              <button
                onClick={() => { setScoutSearch(''); setScoutDateFrom(''); setScoutDateTo('') }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{ background: 'var(--hover-bg)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Scout reports list */}
        {scoutReports.length === 0 ? (
          <div className="rounded-2xl flex flex-col items-center justify-center text-center px-8 py-16"
            style={{ background: 'var(--subtle-bg)', border: '1px dashed rgba(255,159,67,0.3)', minHeight: '280px' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,159,67,0.08)', border: '1px solid rgba(255,159,67,0.2)' }}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#ff9f43">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>No Reports Yet</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-faint)' }}>
              Open a player profile and use the<br />&ldquo;AI Report&rdquo; section to generate and finalize a report.
            </p>
          </div>
        ) : filteredScout.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--subtle-bg)', border: '1px dashed var(--border-strong)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No reports match your filters</p>
            <button onClick={() => { setScoutSearch(''); setScoutDateFrom(''); setScoutDateTo('') }} className="mt-2 text-xs font-medium" style={{ color: '#ff9f43' }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-solid)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-strong)' }}>
            {filteredScout.map((report, i) => {
              const updatedDate = new Date(report.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              return (
                <div key={report.id}
                  className="flex items-center justify-between px-4 py-3.5 group transition-colors"
                  style={{ borderBottom: i < filteredScout.length - 1 ? '1px solid var(--border)' : undefined }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.15)' }}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#00c896">
                        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18 2.5 2.5 0 0 0 10 15.5 2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          <Highlight text={report.player.name} query={scoutSearch} />
                        </p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                          style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.3)' }}>
                          ✓ AI Report
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {report.player.clubName && <><Highlight text={report.player.clubName} query={scoutSearch} /></>}
                        {report.player.position && <><span className="mx-1" style={{ color: 'var(--text-faint)' }}>·</span>{report.player.position}</>}
                        <span className="mx-1" style={{ color: 'var(--text-faint)' }}>·</span>{updatedDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Link
                      href={`/databases/${report.player.databaseId}/players/${report.player.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: 'rgba(0,200,150,0.08)', color: '#00c896', border: '1px solid rgba(0,200,150,0.2)' }}
                    >
                      View
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Right: Snapshots ── */}
      <div className="flex flex-col gap-4">
        {/* Section header */}
        <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.18)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#00c896">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Snapshots</h2>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Saved player list exports</p>
          </div>
        </div>

        {/* Search + date filters */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-faint)' }}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              value={snapSearch}
              onChange={e => setSnapSearch(e.target.value)}
              placeholder="Search by name or database…"
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-sm focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
            />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>To</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-sm focus:outline-none"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
            />
            {hasSnapFilters && (
              <button
                onClick={clearSnapFilters}
                className="px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{ background: 'var(--hover-bg)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Result count */}
        {hasSnapFilters && (
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            {filteredSnaps.length === 0
              ? 'No snapshots match your filters'
              : `${filteredSnaps.length} of ${reports.length} snapshot${reports.length !== 1 ? 's' : ''}`}
          </p>
        )}

        {/* List */}
        {reports.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--subtle-bg)', border: '1px dashed var(--border-strong)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.18)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#00c896">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
              </svg>
            </div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>No snapshots yet</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Go to a database and click &ldquo;Save Snapshot&rdquo;</p>
          </div>
        ) : filteredSnaps.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--subtle-bg)', border: '1px dashed var(--border-strong)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No snapshots match your filters</p>
            <button onClick={clearSnapFilters} className="mt-2 text-xs font-medium" style={{ color: '#00c896' }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-solid)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-strong)' }}>
            {filteredSnaps.map((report, i) => (
              <div
                key={report.id}
                className="flex items-center justify-between px-4 py-3.5 group transition-colors"
                style={{ borderBottom: i < filteredSnaps.length - 1 ? '1px solid var(--border)' : undefined }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.15)' }}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#00c896">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      <Highlight text={report.name} query={snapSearch} />
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      <Highlight text={report.databaseName} query={snapSearch} />
                      <span className="mx-1.5" style={{ color: 'var(--text-faint)' }}>·</span>
                      {report.playerCount} player{report.playerCount !== 1 ? 's' : ''}
                      <span className="mx-1.5" style={{ color: 'var(--text-faint)' }}>·</span>
                      {new Date(report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Link
                    href={`/reports/${report.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: 'rgba(0,200,150,0.08)', color: '#00c896', border: '1px solid rgba(0,200,150,0.2)' }}
                  >
                    View
                  </Link>
                  <button
                    onClick={() => setConfirmDeleteId(report.id)}
                    disabled={deleting === report.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    {deleting === report.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>

      {/* Delete snapshot confirmation modal */}
      {confirmDeleteId && (() => {
        const snap = reports.find(r => r.id === confirmDeleteId)
        if (!snap) return null
        const isDeleting = deleting === confirmDeleteId
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            onClick={() => !isDeleting && setConfirmDeleteId(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(239,68,68,0.08)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Top accent bar */}
              <div style={{ height: 3, position: 'relative', overflow: 'hidden', background: isDeleting ? 'rgba(239,68,68,0.15)' : 'linear-gradient(90deg, #ef4444, #dc2626)' }}>
                {isDeleting && (
                  <div style={{ position: 'absolute', top: 0, width: '45%', height: '100%', background: 'linear-gradient(90deg, transparent, #ef4444, rgba(239,68,68,0.4))', animation: 'sl-progress 1.4s ease-in-out infinite' }} />
                )}
              </div>

              <div className="p-6">
                {/* Header row */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ef4444"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Delete Snapshot</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>This action cannot be undone</p>
                  </div>
                </div>

                {/* Snapshot chip */}
                <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#ef4444">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
                  </svg>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{snap.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-faint)' }}>{snap.databaseName} · {snap.playerCount} player{snap.playerCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <p className="text-xs mb-5" style={{ color: 'var(--text-faint)' }}>
                  The snapshot data will be permanently removed. The original player list is not affected.
                </p>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                    style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(confirmDeleteId)}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-default"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', boxShadow: '0 2px 12px rgba(239,68,68,0.25)', cursor: isDeleting ? 'default' : 'pointer' }}
                    onMouseEnter={e => { if (!isDeleting) e.currentTarget.style.boxShadow = '0 4px 20px rgba(239,68,68,0.45)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(239,68,68,0.25)' }}
                  >
                    {isDeleting ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <>{text}</>
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(0,200,150,0.25)', color: 'inherit', borderRadius: '2px', padding: '0 1px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  )
}
