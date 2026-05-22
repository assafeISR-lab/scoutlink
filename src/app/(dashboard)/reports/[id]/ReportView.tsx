'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface PlayerNote {
  content: string
  createdAt: string
  agentName: string | null
}

interface Player {
  id: string
  name: string
  age?: number | null
  clubName?: string | null
  position?: string | null
  nationality?: string | null
  heightCm?: number | null
  marketValue?: number | null
  agentName?: string | null
  fmAttributes?: string | null
  playsNational?: boolean
  notes?: PlayerNote[]
}

interface ReportData {
  id: string
  name: string
  databaseName: string
  playerCount: number
  createdAt: string
  players: Player[]
}

export default function ReportView({ report }: { report: ReportData }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  function handlePrint() {
    window.print()
  }

  function handleDownloadCSV() {
    const headers = ['Name', 'Position', 'Club', 'Nationality', 'Age', 'Height (cm)', 'Market Value', 'Agent', 'FM Attributes', 'National Team']
    const rows = report.players.map(p => [
      p.name ?? '',
      p.position ?? '',
      p.clubName ?? '',
      p.nationality ?? '',
      p.age ?? '',
      p.heightCm ?? '',
      p.marketValue != null ? `€${(p.marketValue / 1_000_000).toFixed(1)}M` : '',
      p.agentName ?? '',
      p.fmAttributes ?? '',
      p.playsNational ? 'Yes' : '',
    ])
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

  async function handleDelete() {
    if (!confirm('Delete this report permanently?')) return
    setDeleting(true)
    await fetch(`/api/reports/${report.id}`, { method: 'DELETE' })
    router.push('/reports')
    router.refresh()
  }

  const cols: { key: keyof Player; label: string }[] = [
    { key: 'name',          label: 'Player' },
    { key: 'position',      label: 'Position' },
    { key: 'clubName',      label: 'Club' },
    { key: 'nationality',   label: 'Nationality' },
    { key: 'age',           label: 'Age' },
    { key: 'heightCm',      label: 'Height' },
    { key: 'marketValue',   label: 'Market Value' },
    { key: 'agentName',     label: 'Agent' },
    { key: 'fmAttributes',  label: 'FM Attributes' },
    { key: 'playsNational', label: 'National' },
  ]

  const activeCols = cols.filter(col =>
    report.players.some(p => {
      const v = p[col.key]
      return v != null && v !== '' && v !== false
    })
  )

  const allNotes = report.players.flatMap(p =>
    (p.notes ?? []).map(n => ({ ...n, playerName: p.name }))
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--hover-bg)', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', color: '#00c896' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            {deleting ? 'Deleting...' : 'Delete'}
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
          className="rounded-2xl overflow-hidden print:border print:border-gray-300"
          style={{ background: 'var(--card-solid)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-strong)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="print:bg-gray-100" style={{ borderBottom: '2px solid var(--border-strong)' }}>
                {activeCols.map((col, ci) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide print:text-gray-600"
                    style={{
                      color: 'var(--text-muted)',
                      background: 'rgba(0,200,150,0.025)',
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
                  key={player.id ?? i}
                  className="transition-colors print:border-b print:border-gray-200"
                  style={{
                    borderBottom: i < report.players.length - 1 ? '1px solid var(--border)' : undefined,
                    background: i % 2 === 1 ? 'var(--subtle-bg)' : undefined,
                  }}
                >
                  {activeCols.map((col, ci) => {
                    const v = player[col.key]
                    let display: React.ReactNode
                    if (col.key === 'heightCm') display = v != null ? `${v} cm` : null
                    else if (col.key === 'marketValue') display = v != null ? `€${((v as number) / 1_000_000).toFixed(1)}M` : null
                    else if (col.key === 'playsNational') display = v ? '✓' : null
                    else display = v != null ? String(v) : null
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
    </>
  )
}
