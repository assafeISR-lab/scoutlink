'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CreatedDb {
  id: string
  name: string
  playerCount: number
  sharedWith: number
  permission: string
  createdAt: string
}

export default function CreateDatabaseButton({ onCreated }: { onCreated?: (db: CreatedDb) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/databases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setOpen(false)
      setName('')
      onCreated?.({
        id: data.id,
        name: data.name,
        playerCount: 0,
        sharedWith: 0,
        permission: 'owner',
        createdAt: data.createdAt,
      })
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setName(''); setError('') }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--text-faint)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--subtle-bg)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        New List
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
              boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,200,150,0.08)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div style={{ height: 3, position: 'relative', overflow: 'hidden', background: loading ? 'rgba(0,200,150,0.15)' : 'linear-gradient(90deg, #00c896, #00a878)' }}>
              {loading && (
                <div style={{ position: 'absolute', top: 0, width: '45%', height: '100%', background: 'linear-gradient(90deg, transparent, #00c896, rgba(0,200,150,0.4))', animation: 'sl-progress 1.4s ease-in-out infinite' }} />
              )}
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)' }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#00c896"><path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4S4 11.21 4 9zm0 5v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z"/></svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Create New List</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>A new scouting database for your players</p>
                </div>
              </div>

              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>List Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setError('') }}
                    placeholder="e.g. Premier League 2025"
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid #00c896', color: 'var(--text-primary)' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
                  </div>
                )}

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-default"
                    style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#fff', boxShadow: '0 2px 12px rgba(0,200,150,0.25)', cursor: (loading || !name.trim()) ? 'default' : 'pointer' }}
                    onMouseEnter={e => { if (!loading && name.trim()) e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.45)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,200,150,0.25)' }}
                  >
                    {loading ? 'Creating…' : 'Create List'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
