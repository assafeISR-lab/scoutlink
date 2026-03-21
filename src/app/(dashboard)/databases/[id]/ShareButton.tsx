'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ShareEntry {
  id: string
  permission: string
  agent: { id: string; email: string; fullName: string }
}

export default function ShareButton({ databaseId }: { databaseId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
        style={{ background: 'rgba(108,143,255,0.12)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.2)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
        </svg>
        Share
      </button>

      {open && <ShareModal databaseId={databaseId} onClose={() => setOpen(false)} />}
    </>
  )
}

function ShareModal({ databaseId, onClose }: { databaseId: string; onClose: () => void }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'read' | 'contributor'>('read')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [shares, setShares] = useState<ShareEntry[]>([])
  const [loadingShares, setLoadingShares] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/databases/${databaseId}/access`)
      .then(r => r.json())
      .then(data => { setShares(data); setLoadingShares(false) })
  }, [databaseId])

  async function handleShare() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')

    const res = await fetch(`/api/databases/${databaseId}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), permission }),
    })

    const data = await res.json()
    if (res.ok) {
      setSuccess(`Shared with ${data.agent.fullName || email}`)
      setEmail('')
      setShares(prev => {
        const existing = prev.findIndex(s => s.agent.id === data.agent.id)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = data
          return updated
        }
        return [...prev, data]
      })
      router.refresh()
    } else {
      setError(data.error || 'Something went wrong')
    }
    setLoading(false)
  }

  async function handleRemove(agentId: string) {
    setRemovingId(agentId)
    await fetch(`/api/databases/${databaseId}/access`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    })
    setShares(prev => prev.filter(s => s.agent.id !== agentId))
    setRemovingId(null)
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 border border-white/10" style={{ background: '#141720' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(108,143,255,0.12)', border: '1px solid rgba(108,143,255,0.2)' }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#6c8fff">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Share Database</h2>
            <p className="text-xs text-white/30">Invite others to view or collaborate</p>
          </div>
        </div>

        {/* Invite form */}
        <div className="mb-5">
          <label className="block text-xs text-white/40 mb-1.5">Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); setSuccess('') }}
            onKeyDown={e => e.key === 'Enter' && handleShare()}
            placeholder="colleague@example.com"
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none mb-3"
            style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)' }}
            onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
          />

          {/* Permission selector */}
          <div className="flex gap-2 mb-3">
            {(['read', 'contributor'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPermission(p)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all capitalize"
                style={{
                  background: permission === p ? (p === 'read' ? 'rgba(108,143,255,0.15)' : 'rgba(0,200,150,0.12)') : 'rgba(255,255,255,0.04)',
                  color: permission === p ? (p === 'read' ? '#6c8fff' : '#00c896') : 'rgba(255,255,255,0.3)',
                  border: `1px solid ${permission === p ? (p === 'read' ? 'rgba(108,143,255,0.3)' : 'rgba(0,200,150,0.25)') : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {p === 'read' ? '👁 View only' : '✏️ Contributor'}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-white/20 mb-3">
            {permission === 'read' ? 'Can view players and notes, cannot make changes.' : 'Can add, edit, and delete players and notes.'}
          </p>

          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
          {success && <p className="text-xs mb-2" style={{ color: '#00c896' }}>{success} ✓</p>}

          <button
            onClick={handleShare}
            disabled={loading || !email.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aee)' }}
          >
            {loading ? 'Sharing...' : 'Share'}
          </button>
        </div>

        {/* Current shares */}
        <div>
          <p className="text-xs uppercase tracking-widest text-white/30 mb-3">
            {loadingShares ? 'Loading...' : shares.length === 0 ? 'Not shared yet' : `Shared with ${shares.length} ${shares.length === 1 ? 'person' : 'people'}`}
          </p>
          {shares.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aee)' }}>
                {s.agent.fullName?.[0]?.toUpperCase() || s.agent.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{s.agent.fullName || s.agent.email}</p>
                <p className="text-xs text-white/30 truncate">{s.agent.email}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{
                background: s.permission === 'contributor' ? 'rgba(0,200,150,0.1)' : 'rgba(108,143,255,0.1)',
                color: s.permission === 'contributor' ? '#00c896' : '#6c8fff',
              }}>
                {s.permission === 'contributor' ? 'Contributor' : 'View only'}
              </span>
              <button
                onClick={() => handleRemove(s.agent.id)}
                disabled={removingId === s.agent.id}
                className="text-white/20 hover:text-red-400 transition-colors disabled:opacity-50 flex-shrink-0"
                title="Remove access"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="mt-5 w-full py-2 rounded-xl text-sm text-white/30 hover:text-white/60 transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}>
          Done
        </button>
      </div>
    </div>
  )
}
