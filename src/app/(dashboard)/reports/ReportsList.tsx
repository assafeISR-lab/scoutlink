'use client'

import { useState } from 'react'
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

  async function handleDelete(id: string) {
    if (!confirm('Delete this report? This cannot be undone.')) return
    setDeleting(id)
    await fetch(`/api/reports/${id}`, { method: 'DELETE' })
    setReports(r => r.filter(x => x.id !== id))
    setDeleting(null)
    router.refresh()
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center" style={{ background: 'var(--subtle-bg)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#00c89615', border: '1px solid #00c89630' }}>
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#00c896">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
          </svg>
        </div>
        <p className="text-white/40 text-sm mb-1">No reports yet</p>
        <p className="text-white/20 text-xs">Go to a database and click "Create Report" to save a snapshot</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {reports.map(report => (
        <div
          key={report.id}
          className="rounded-2xl border border-white/8 flex items-center justify-between px-6 py-4 group"
          style={{ background: 'var(--card-bg)' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#00c89615', border: '1px solid #00c89630' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#00c896">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{report.name}</p>
              <p className="text-white/40 text-xs mt-0.5">
                {report.databaseName} · {report.playerCount} player{report.playerCount !== 1 ? 's' : ''} · {new Date(report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link
              href={`/reports/${report.id}`}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: '#00c89620', color: '#00c896', border: '1px solid #00c89640' }}
            >
              View
            </Link>
            <button
              onClick={() => handleDelete(report.id)}
              disabled={deleting === report.id}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {deleting === report.id ? '...' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
