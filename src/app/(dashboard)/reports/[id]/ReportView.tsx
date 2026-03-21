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
  weightKg?: number | null
  marketValue?: number | null
  agentName?: string | null
  playsNational?: boolean
  goalsThisYear?: number | null
  totalGoals?: number | null
  totalGames?: number | null
  nationalGames?: number | null
  yearsInProClub?: number | null
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
    const headers = ['Name', 'Position', 'Club', 'Nationality', 'Age', 'Height (cm)', 'Weight (kg)', 'Market Value', 'Agent', 'Goals (Year)', 'Total Goals', 'Total Games', 'National Games', 'Pro Years', 'National Team']
    const rows = report.players.map(p => [
      p.name ?? '',
      p.position ?? '',
      p.clubName ?? '',
      p.nationality ?? '',
      p.age ?? '',
      p.heightCm ?? '',
      p.weightKg ?? '',
      p.marketValue != null ? `€${(p.marketValue / 1_000_000).toFixed(1)}M` : '',
      p.agentName ?? '',
      p.goalsThisYear ?? '',
      p.totalGoals ?? '',
      p.totalGames ?? '',
      p.nationalGames ?? '',
      p.yearsInProClub ?? '',
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
    { key: 'name', label: 'Name' },
    { key: 'position', label: 'Position' },
    { key: 'clubName', label: 'Club' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'age', label: 'Age' },
    { key: 'heightCm', label: 'Height' },
    { key: 'weightKg', label: 'Weight' },
    { key: 'marketValue', label: 'Market Value' },
    { key: 'agentName', label: 'Agent' },
    { key: 'goalsThisYear', label: 'Goals (Year)' },
    { key: 'totalGoals', label: 'Total Goals' },
    { key: 'totalGames', label: 'Total Games' },
    { key: 'nationalGames', label: 'National Games' },
    { key: 'yearsInProClub', label: 'Pro Years' },
    { key: 'playsNational', label: 'National Team' },
  ]

  // Only show columns that have at least one non-null/non-false value
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
          <h1 className="text-3xl font-bold text-white mb-1">{report.name}</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {report.databaseName} · {report.playerCount} player{report.playerCount !== 1 ? 's' : ''} · Created {new Date(report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Save CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: '#00c89620', border: '1px solid #00c89640', color: '#00c896' }}
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
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
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
        <p className="text-white/40 text-sm">No players in this report.</p>
      ) : (
        <div className="rounded-2xl border border-white/8 overflow-hidden print:border print:border-gray-300">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }} className="print:bg-gray-100">
                {activeCols.map(col => (
                  <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/40 print:text-gray-600">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.players.map((player, i) => (
                <tr
                  key={player.id ?? i}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  className="hover:bg-white/[0.02] transition-colors print:border-b print:border-gray-200"
                >
                  {activeCols.map(col => {
                    const v = player[col.key]
                    let display: React.ReactNode
                    if (col.key === 'heightCm') display = v != null ? `${v} cm` : null
                    else if (col.key === 'weightKg') display = v != null ? `${v} kg` : null
                    else if (col.key === 'marketValue') display = v != null ? `€${((v as number) / 1_000_000).toFixed(1)}M` : null
                    else if (col.key === 'playsNational') display = v ? 'Yes' : null
                    else display = v != null ? String(v) : null
                    return (
                      <td key={col.key} className="px-4 py-3 text-white/80 print:text-gray-900">
                        {display ?? <span className="text-white/20 print:text-gray-400">—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes section */}
      {allNotes.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-4">Scouting Notes</h2>
          <div className="space-y-3">
            {allNotes.map((note, i) => (
              <div key={i} className="rounded-xl border border-white/8 p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                {report.playerCount > 1 && (
                  <p className="text-xs font-semibold text-white/40 mb-1">{note.playerName}</p>
                )}
                <p className="text-sm text-white/80 whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-white/25 mt-2">
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
