'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface PlayerSnapshot {
  id: string
  name: string
  position: string | null
  clubName: string | null
  nationality: string | null
  age: number | null
  heightCm: number | null
  marketValue: number | null
  agentName: string | null
  fmAttributes: string | null
  playsNational: boolean
  notes: unknown[]
}

interface Props {
  players: PlayerSnapshot[]
  databaseId: string
  databaseName: string
  defaultName?: string
  onClose: () => void
}

export default function CreateReportModal({ players, databaseId, databaseName, defaultName = '', onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState(defaultName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) { setError('Report name is required'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), databaseId, databaseName, players }),
      })
      if (res.ok) {
        onClose()
        router.push('/reports')
        router.refresh()
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Something went wrong')
        setLoading(false)
      }
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-6 border border-white/10" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,159,67,0.12)', border: '1px solid rgba(255,159,67,0.25)' }}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ff9f43">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-1">Create Report</h2>
        <p className="text-xs mb-5" style={{ color: 'var(--text-faint)' }}>
          {players.length} player{players.length !== 1 ? 's' : ''} from <span style={{ color: 'var(--text-secondary)' }}>{databaseName}</span>
        </p>

        <div className="mb-4">
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Report Name *</label>
          <input
            autoFocus
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder={`${databaseName} — ${new Date().toLocaleDateString()}`}
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onFocus={e => e.currentTarget.style.borderColor = '#ff9f43'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
        </div>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #ff9f43, #f38b2a)', color: '#fff' }}
          >
            {loading ? 'Creating…' : 'Create Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
