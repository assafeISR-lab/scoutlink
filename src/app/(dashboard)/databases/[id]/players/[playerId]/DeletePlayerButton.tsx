'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeletePlayerButton({ databaseId, playerId, playerName }: {
  databaseId: string
  playerId: string
  playerName: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/databases/${databaseId}/players/${playerId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/databases')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all"
        style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        Delete
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => !loading && setOpen(false)}
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
            <div style={{ height: 3, position: 'relative', overflow: 'hidden', background: loading ? 'rgba(239,68,68,0.15)' : 'linear-gradient(90deg, #ef4444, #dc2626)' }}>
              {loading && (
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
                  <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Delete Player</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>This action cannot be undone</p>
                </div>
              </div>

              {/* Player chip */}
              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{playerName}</span>
              </div>

              <p className="text-xs mb-5" style={{ color: 'var(--text-faint)' }}>
                All player data, notes, and history will be permanently removed.
              </p>

              {error && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
                </div>
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-default"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', boxShadow: '0 2px 12px rgba(239,68,68,0.25)', cursor: loading ? 'default' : 'pointer' }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 4px 20px rgba(239,68,68,0.45)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(239,68,68,0.25)' }}
                >
                  {loading ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
