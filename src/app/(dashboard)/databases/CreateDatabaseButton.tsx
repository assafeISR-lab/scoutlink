'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateDatabaseButton() {
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
      setOpen(false)
      setName('')
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
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-black transition-all duration-200 hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        New Database
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setOpen(false)}>
          <div className="w-full max-w-md mx-4 rounded-2xl p-6 border border-white/10" style={{ background: '#141720' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-1">Create Database</h2>
            <p className="text-sm text-white/30 mb-6">Give your scouting database a name</p>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-white/50 mb-1">Database Name</label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Premier League 2025"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#00c896] transition-colors"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading || !name.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
