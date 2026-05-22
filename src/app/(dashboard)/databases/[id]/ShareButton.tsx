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
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,143,255,0.18)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(108,143,255,0.2)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,143,255,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
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
        if (existing >= 0) { const updated = [...prev]; updated[existing] = data; return updated }
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(108,143,255,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, position: 'relative', overflow: 'hidden', background: loading ? 'rgba(108,143,255,0.15)' : 'linear-gradient(90deg, #6c8fff, #5a7aee)' }}>
          {loading && (
            <div style={{ position: 'absolute', top: 0, width: '45%', height: '100%', background: 'linear-gradient(90deg, transparent, #6c8fff, rgba(108,143,255,0.4))', animation: 'sl-progress 1.4s ease-in-out infinite' }} />
          )}
        </div>

        <div className="p-6">
          {/* Header row */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(108,143,255,0.12)', border: '1px solid rgba(108,143,255,0.25)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#6c8fff">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Share Database</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>Invite others to view or collaborate</p>
            </div>
          </div>

          {/* Invite form */}
          <div className="mb-5">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Email address</label>
            <input
              autoFocus
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); setSuccess('') }}
              onKeyDown={e => e.key === 'Enter' && handleShare()}
              placeholder="colleague@example.com"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none mb-3"
              style={{ background: 'var(--input-bg)', border: '1px solid #6c8fff', color: 'var(--text-primary)' }}
              onFocus={e => e.currentTarget.style.borderColor = '#6c8fff'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />

            {/* Permission selector */}
            <div className="flex gap-2 mb-3">
              {(['read', 'contributor'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPermission(p)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all capitalize"
                  style={{
                    background: permission === p ? (p === 'read' ? 'rgba(108,143,255,0.15)' : 'rgba(0,200,150,0.12)') : 'var(--subtle-bg)',
                    color: permission === p ? (p === 'read' ? '#6c8fff' : '#00c896') : 'var(--text-faint)',
                    border: `1px solid ${permission === p ? (p === 'read' ? 'rgba(108,143,255,0.3)' : 'rgba(0,200,150,0.25)') : 'var(--border)'}`,
                  }}
                >
                  {p === 'read' ? '👁 View only' : '✏️ Contributor'}
                </button>
              ))}
            </div>

            <p className="text-[10px] mb-3" style={{ color: 'var(--text-faint)' }}>
              {permission === 'read' ? 'Can view players and notes, cannot make changes.' : 'Can add, edit, and delete players and notes.'}
            </p>

            {error && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)' }}>
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#00c896"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                <p className="text-xs" style={{ color: '#00c896' }}>{success}</p>
              </div>
            )}

            <button
              onClick={handleShare}
              disabled={loading || !email.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-default transition-all"
              style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aee)', color: '#fff', boxShadow: '0 2px 12px rgba(108,143,255,0.25)', cursor: (loading || !email.trim()) ? 'default' : 'pointer' }}
              onMouseEnter={e => { if (!loading && email.trim()) e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,143,255,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(108,143,255,0.25)' }}
            >
              {loading ? 'Sharing…' : 'Share'}
            </button>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border)', marginBottom: 16 }} />

          {/* Current shares */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>
              {loadingShares ? 'Loading…' : shares.length === 0 ? 'Not shared yet' : `Shared with ${shares.length} ${shares.length === 1 ? 'person' : 'people'}`}
            </p>
            {shares.map(s => (
              <div key={s.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6c8fff, #5a7aee)' }}>
                  {s.agent.fullName?.[0]?.toUpperCase() || s.agent.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.agent.fullName || s.agent.email}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-faint)' }}>{s.agent.email}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{
                  background: s.permission === 'contributor' ? 'rgba(0,200,150,0.1)' : 'rgba(108,143,255,0.1)',
                  color: s.permission === 'contributor' ? '#00c896' : '#6c8fff',
                  border: `1px solid ${s.permission === 'contributor' ? 'rgba(0,200,150,0.2)' : 'rgba(108,143,255,0.2)'}`,
                }}>
                  {s.permission === 'contributor' ? 'Contributor' : 'View only'}
                </span>
                <button
                  onClick={() => handleRemove(s.agent.id)}
                  disabled={removingId === s.agent.id}
                  className="flex-shrink-0 transition-colors disabled:opacity-40"
                  style={{ color: 'var(--text-faint)' }}
                  title="Remove access"
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="mt-5 w-full py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
