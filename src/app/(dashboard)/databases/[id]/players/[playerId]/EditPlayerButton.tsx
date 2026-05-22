'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PlayerData {
  firstName: string
  lastName: string
  middleName: string | null
  position: string | null
  clubName: string | null
  nationality: string | null
  agentName: string | null
  dateOfBirth: Date | null
  heightCm: number | null
  marketValue: number | null
  playsNational: boolean
}

export default function EditPlayerButton({ databaseId, playerId, player }: {
  databaseId: string
  playerId: string
  player: PlayerData
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const toDateStr = (d: Date | null) => d ? new Date(d).toISOString().split('T')[0] : ''

  const [form, setForm] = useState({
    firstName: player.firstName,
    lastName: player.lastName,
    middleName: player.middleName ?? '',
    position: player.position ?? '',
    clubName: player.clubName ?? '',
    nationality: player.nationality ?? '',
    agentName: player.agentName ?? '',
    dateOfBirth: toDateStr(player.dateOfBirth),
    heightCm: player.heightCm?.toString() ?? '',
    marketValue: player.marketValue != null ? (player.marketValue / 1_000_000).toString() : '',
    playsNational: player.playsNational,
  })

  const [changedFields, setChangedFields] = useState<Set<string>>(new Set())

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
    setChangedFields(prev => new Set([...prev, field]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch(`/api/databases/${databaseId}/players/${playerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, changedFields: [...changedFields] }),
    })
    if (res.ok) {
      setOpen(false)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
    }
    setLoading(false)
  }

  const canSubmit = !loading && form.firstName.trim() && form.lastName.trim()

  return (
    <>
      <button
        onClick={() => { setOpen(true); setChangedFields(new Set()) }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
        style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        Edit Player
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,200,150,0.08)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div style={{ height: 3, position: 'relative', overflow: 'hidden', background: loading ? 'rgba(0,200,150,0.15)' : 'linear-gradient(90deg, #00c896, #00a878)', flexShrink: 0 }}>
              {loading && (
                <div style={{ position: 'absolute', top: 0, width: '45%', height: '100%', background: 'linear-gradient(90deg, transparent, #00c896, rgba(0,200,150,0.4))', animation: 'sl-progress 1.4s ease-in-out infinite' }} />
              )}
            </div>

            <div className="overflow-y-auto">
              <div className="p-6">
                {/* Header row */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)' }}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#00c896"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Player</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>Update player information</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="First Name *" value={form.firstName} onChange={v => set('firstName', v)} required />
                    <Field label="Middle Name" value={form.middleName} onChange={v => set('middleName', v)} />
                    <Field label="Last Name *" value={form.lastName} onChange={v => set('lastName', v)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Position" value={form.position} onChange={v => set('position', v)} placeholder="Forward" />
                    <Field label="Club" value={form.clubName} onChange={v => set('clubName', v)} placeholder="FC Barcelona" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nationality" value={form.nationality} onChange={v => set('nationality', v)} />
                    <Field label="Agent Name" value={form.agentName} onChange={v => set('agentName', v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Date of Birth" value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} type="date" />
                    <Field label="Height (cm)" value={form.heightCm} onChange={v => set('heightCm', v)} type="number" placeholder="170" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Market Value (€M)" value={form.marketValue} onChange={v => set('marketValue', v)} type="number" placeholder="50" />
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.playsNational} onChange={e => set('playsNational', e.target.checked)}
                          className="w-4 h-4 rounded accent-[#00c896]" />
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Plays for national team</span>
                      </label>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                      <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2.5 mt-2">
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
                      disabled={!canSubmit}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-default"
                      style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#fff', boxShadow: '0 2px 12px rgba(0,200,150,0.25)', cursor: canSubmit ? 'pointer' : 'default' }}
                      onMouseEnter={e => { if (canSubmit) e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.45)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,200,150,0.25)' }}
                    >
                      {loading ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', colorScheme: type === 'date' ? 'dark' : undefined }}
        onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
      />
    </div>
  )
}
