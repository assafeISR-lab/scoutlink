'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { REPORT_COLS, type ReportColDef } from '@/lib/snapshotColumns'

interface PlayerNote {
  content: string
  createdAt: string
  agentName: string | null
}

interface Player {
  id: string
  name: string
  notes?: PlayerNote[]
  [key: string]: unknown
}

interface ReportData {
  id: string
  name: string
  databaseName: string
  playerCount: number
  createdAt: string
  players: Player[]
}

function formatDate(val: unknown): string {
  if (!val) return ''
  try {
    return new Date(String(val) + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(val)
  }
}

function cellText(col: ReportColDef, v: unknown): string {
  if (v == null || v === '') return ''
  if (col.type === 'cm')       return `${v} cm`
  if (col.type === 'currency') return `€${((v as number) / 1_000_000).toFixed(1)}M`
  if (col.type === 'date')     return formatDate(v)
  if (col.type === 'status')   return v ? 'Available' : 'Not Avail.'
  return String(v)
}

export default function ReportView({ report }: { report: ReportData }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const nameCol: ReportColDef = { key: 'name', label: 'Player' }

  const allCols: ReportColDef[] = [nameCol, ...REPORT_COLS]

  const activeCols = allCols.filter(col =>
    report.players.some(p => {
      const v = p[col.key]
      if (col.type === 'status') return v !== undefined
      if (typeof v === 'boolean') return true
      return v != null && v !== ''
    })
  )

  function handlePrint() {
    window.print()
  }

  function handleDownloadCSV() {
    const headers = activeCols.map(c => c.label)
    const rows = report.players.map(p =>
      activeCols.map(col => {
        if (col.key === 'name') return p.name
        return cellText(col, p[col.key])
      })
    )
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.name.replace(/[^a-z0-9]/gi, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    setConfirmDelete(false)
    await fetch(`/api/reports/${report.id}`, { method: 'DELETE' })
    router.push('/reports')
    router.refresh()
  }

  const allNotes = report.players.flatMap(p =>
    ((p.notes ?? []) as PlayerNote[]).map(n => ({ ...n, playerName: p.name }))
  )

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{report.name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}>
              {report.databaseName}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(0,200,150,0.08)', color: '#00c896', border: '1px solid rgba(0,200,150,0.2)' }}>
              {report.playerCount} player{report.playerCount !== 1 ? 's' : ''}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
              Created {new Date(report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-6">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--subtle-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--subtle-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { if (!deleting) { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' } }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Print header — only visible when printing */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold text-black mb-1">{report.name}</h1>
        <p className="text-sm text-gray-600">
          {report.databaseName} · {report.playerCount} player{report.playerCount !== 1 ? 's' : ''} · {new Date(report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Table */}
      {report.players.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No players in this report.</p>
      ) : (
        <div
          className="rounded-2xl print:border print:border-gray-300"
          style={{ background: 'var(--card-solid)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-strong)', overflow: 'hidden' }}
        >
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '60vh' }}>
          <table className="w-full text-sm" style={{ minWidth: 'max-content' }}>
            <thead>
              <tr className="print:bg-gray-100" style={{ borderBottom: '2px solid var(--border-strong)' }}>
                {activeCols.map((col, ci) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide print:text-gray-600"
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      color: 'var(--text-muted)',
                      background: 'var(--card-solid)',
                      borderBottom: '2px solid var(--border-strong)',
                      borderRight: ci < activeCols.length - 1 ? '1px solid var(--border)' : undefined,
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.players.map((player, i) => (
                <tr
                  key={String(player.id ?? i)}
                  className="transition-colors print:border-b print:border-gray-200"
                  style={{
                    borderBottom: i < report.players.length - 1 ? '1px solid var(--border)' : undefined,
                    background: i % 2 === 1 ? 'var(--subtle-bg)' : undefined,
                  }}
                >
                  {activeCols.map((col, ci) => {
                    const v = col.key === 'name' ? player.name : player[col.key]
                    let display: React.ReactNode
                    if (col.key === 'name') {
                      display = player.name
                    } else {
                      const text = cellText(col, v)
                      display = text || null
                    }
                    return (
                      <td
                        key={col.key}
                        className="px-4 py-3 print:text-gray-900"
                        style={{
                          color: col.key === 'name' ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontWeight: col.key === 'name' ? 600 : 400,
                          borderRight: ci < activeCols.length - 1 ? '1px solid var(--border)' : undefined,
                        }}
                      >
                        {display ?? <span className="print:text-gray-400" style={{ color: 'var(--text-faint)' }}>—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Scouting Notes */}
      {allNotes.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            Scouting Notes
          </h2>
          <div className="flex flex-col gap-3">
            {allNotes.map((note, i) => (
              <div
                key={i}
                className="rounded-xl p-4"
                style={{ background: 'var(--card-solid)', border: '1px solid var(--border-strong)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                {report.playerCount > 1 && (
                  <p className="text-xs font-semibold mb-1.5" style={{ color: '#00c896' }}>{note.playerName}</p>
                )}
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{note.content}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-faint)' }}>
                  {note.agentName && <span>{note.agentName} · </span>}
                  {new Date(note.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:border { border: 1px solid #d1d5db !important; }
          .print\\:border-b { border-bottom: 1px solid #e5e7eb !important; }
          .print\\:border-gray-200 { border-color: #e5e7eb !important; }
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
          .print\\:bg-gray-100 { background: #f3f4f6 !important; }
          .print\\:text-gray-600 { color: #4b5563 !important; }
          .print\\:text-gray-900 { color: #111827 !important; }
          .print\\:text-gray-400 { color: #9ca3af !important; }
        }
      `}</style>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => !deleting && setConfirmDelete(false)}
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
            <div style={{ height: 3, position: 'relative', overflow: 'hidden', background: deleting ? 'rgba(239,68,68,0.15)' : 'linear-gradient(90deg, #ef4444, #dc2626)' }}>
              {deleting && (
                <div style={{ position: 'absolute', top: 0, width: '45%', height: '100%', background: 'linear-gradient(90deg, transparent, #ef4444, rgba(239,68,68,0.4))', animation: 'sl-progress 1.4s ease-in-out infinite' }} />
              )}
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ef4444"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Delete Snapshot</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>This action cannot be undone</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#ef4444">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
                </svg>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{report.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-faint)' }}>{report.databaseName} · {report.playerCount} player{report.playerCount !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <p className="text-xs mb-5" style={{ color: 'var(--text-faint)' }}>
                The snapshot data will be permanently removed. The original player list is not affected.
              </p>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-default"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', boxShadow: '0 2px 12px rgba(239,68,68,0.25)', cursor: deleting ? 'default' : 'pointer' }}
                  onMouseEnter={e => { if (!deleting) e.currentTarget.style.boxShadow = '0 4px 20px rgba(239,68,68,0.45)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(239,68,68,0.25)' }}
                >
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
