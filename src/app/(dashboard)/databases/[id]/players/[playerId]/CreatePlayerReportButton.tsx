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
  marketValue: number | null
  dateOfBirth: string | null
  available: boolean
  notes: Note[]
  [key: string]: unknown
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--subtle-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-faint)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        title="Create Scouting Report"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
        Scout Report
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,159,67,0.08)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top accent bar — animates during save */}
            <div style={{ height: 3, position: 'relative', overflow: 'hidden', background: loading ? 'rgba(255,159,67,0.15)' : 'linear-gradient(90deg, #ff9f43, #f38b2a)' }}>
              {loading && (
                <div style={{
                  position: 'absolute', top: 0, width: '45%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, #ff9f43, rgba(255,159,67,0.4))',
                  animation: 'sl-progress 1.4s ease-in-out infinite',
                }} />
              )}
            </div>

            <div className="p-6">
              {/* Header row */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,159,67,0.12)', border: '1px solid rgba(255,159,67,0.25)' }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ff9f43">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Create Scout Report</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                    Saved and visible in <span style={{ color: '#ff9f43' }}>Scout Reports</span>
                  </p>
                </div>
              </div>

              {/* Meta chips */}
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <span
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  {player.name}
                </span>
                {player.notes.length > 0 && (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}
                  >
                    {player.notes.length} note{player.notes.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Input */}
              <div className="mb-5">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Report Name</label>
                <input
                  autoFocus
                  value={name}
                  onChange={e => { setName(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder={`${player.name} — ${new Date().toLocaleDateString()}`}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: 'var(--input-bg)', border: '1px solid #ff9f43', color: 'var(--text-primary)' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#ff9f43'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#ef4444">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2.5">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !name.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-default"
                  style={{ background: 'linear-gradient(135deg, #ff9f43, #f38b2a)', color: '#fff', boxShadow: '0 2px 12px rgba(255,159,67,0.25)', cursor: (loading || !name.trim()) ? 'default' : 'pointer' }}
                  onMouseEnter={e => { if (!loading && name.trim()) e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,159,67,0.45)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(255,159,67,0.25)' }}
                >
                  {loading ? 'Saving…' : 'Create Scout Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
