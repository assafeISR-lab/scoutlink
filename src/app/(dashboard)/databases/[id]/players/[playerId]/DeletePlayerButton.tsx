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

    const res = await fetch(`/api/databases/${databaseId}/players/${playerId}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      router.push(`/databases/${databaseId}`)
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
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
        style={{ background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.8)', border: '1px solid rgba(239,68,68,0.15)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        Delete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => !loading && setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6 border border-white/10" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </div>

            <h2 className="text-lg font-semibold text-white text-center mb-2">Delete Player</h2>
            <p className="text-sm text-white/40 text-center mb-1">
              Are you sure you want to delete
            </p>
            <p className="text-sm font-semibold text-white text-center mb-6">"{playerName}"?</p>
            <p className="text-xs text-white/25 text-center mb-6">This action cannot be undone. All player data, notes, and history will be permanently removed.</p>

            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--hover-bg)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'var(--text-primary)' }}
              >
                {loading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
