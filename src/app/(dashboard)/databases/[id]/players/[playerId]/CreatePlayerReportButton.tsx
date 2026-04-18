'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Note {
  content: string
  createdAt: string
  agentName: string | null
}

interface PlayerSnapshot {
  id: string
  name: string
  position: string | null
  clubName: string | null
  nationality: string | null
  age: number | null
  heightCm: number | null
  weightKg: number | null
  marketValue: number | null
  agentName: string | null
  playsNational: boolean
  goalsThisYear: number | null
  totalGoals: number | null
  totalGames: number | null
  nationalGames: number | null
  yearsInProClub: number | null
  notes: Note[]
}

interface Props {
  player: PlayerSnapshot
  databaseId: string
  databaseName: string
}

export default function CreatePlayerReportButton({ player, databaseId, databaseName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) { setError('Report name is required'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          databaseId,
          databaseName,
          players: [player],
        }),
      })
      if (res.ok) {
        setOpen(false)
        router.push('/reports')
        router.refresh()
      } else {
        const text = await res.text()
        let msg = 'Something went wrong'
        try { msg = JSON.parse(text)?.error || msg } catch {}
        setError(msg)
        setLoading(false)
      }
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setName(''); setError('') }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
        style={{ background: 'rgba(255,159,67,0.12)', color: '#ff9f43', border: '1px solid rgba(255,159,67,0.25)' }}
        title="Create Report"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
        Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6 border border-white/10" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,159,67,0.12)', border: '1px solid rgba(255,159,67,0.25)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ff9f43">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Create Player Report</h2>
            <p className="text-xs text-white/30 mb-5">
              Saving full profile + {player.notes.length} note{player.notes.length !== 1 ? 's' : ''} for <span className="text-white/50">{player.name}</span>
            </p>

            <div className="mb-4">
              <label className="block text-xs text-white/40 mb-1">Report Name *</label>
              <input
                autoFocus
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder={`${player.name} — ${new Date().toLocaleDateString()}`}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
                onFocus={e => e.currentTarget.style.borderColor = '#ff9f43'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm text-white/40" style={{ background: 'var(--hover-bg)' }}>Cancel</button>
              <button
                onClick={handleCreate}
                disabled={loading || !name.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #ff9f43, #f38b2a)', color: '#fff' }}
              >
                {loading ? 'Creating...' : 'Create Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
