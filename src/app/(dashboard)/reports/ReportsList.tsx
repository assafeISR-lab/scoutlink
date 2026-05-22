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

export default function ReportsList({ reports: initial }: { reports: Report[] }) {
  const router = useRouter()
  const [reports, setReports] = useState(initial)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  async function handleDelete(id: string) {
    if (!confirm('Delete this report? This cannot be undone.')) return
    setDeleting(id)
    await fetch(`/api/reports/${id}`, { method: 'DELETE' })
    setReports(r => r.filter(x => x.id !== id))
    setDeleting(null)
    router.refresh()
  }

  function clearFilters() {
    setSearch('')
    setDateFrom('')
    setDateTo('')
  }

  const hasFilters = search.trim() || dateFrom || dateTo

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
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
  }, [reports, search, dateFrom, dateTo])

  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    color: 'var(--text-primary)',
    colorScheme: 'light',
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl p-16 text-center" style={{ background: 'var(--subtle-bg)', border: '1px dashed var(--border-strong)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)' }}>
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#00c896">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
          </svg>
        </div>
        <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>No reports yet</p>
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Go to a database and click &ldquo;Create Report&rdquo; to save a snapshot</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-faint)' }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or database…"
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none"
            style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
          />
        </div>

        {/* Date from */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm focus:outline-none"
            style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
          />
        </div>

        {/* Date to */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>To</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm focus:outline-none"
            style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{ background: 'var(--hover-bg)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Result count when filtering */}
      {hasFilters && (
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {filtered.length === 0 ? 'No reports match your filters' : `${filtered.length} of ${reports.length} report${reports.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--subtle-bg)', border: '1px dashed var(--border-strong)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No reports match your filters</p>
          <button onClick={clearFilters} className="mt-3 text-xs font-medium" style={{ color: '#00c896' }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-solid)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-strong)' }}>
          {filtered.map((report, i) => (
            <div
              key={report.id}
              className="flex items-center justify-between px-5 py-4 group transition-colors"
              style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : undefined }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.18)' }}>
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="#00c896">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    <Highlight text={report.name} query={search} />
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    <Highlight text={report.databaseName} query={search} />
                    <span className="mx-1.5" style={{ color: 'var(--text-faint)' }}>·</span>
                    {report.playerCount} player{report.playerCount !== 1 ? 's' : ''}
                    <span className="mx-1.5" style={{ color: 'var(--text-faint)' }}>·</span>
                    {new Date(report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-4">
                <Link
                  href={`/reports/${report.id}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: 'rgba(0,200,150,0.08)', color: '#00c896', border: '1px solid rgba(0,200,150,0.2)' }}
                >
                  View
                </Link>
                <button
                  onClick={() => handleDelete(report.id)}
                  disabled={deleting === report.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors opacity-0 group-hover:opacity-100"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  {deleting === report.id ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Highlights matching query substring in text
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
