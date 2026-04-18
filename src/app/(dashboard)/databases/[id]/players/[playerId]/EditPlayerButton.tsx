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
  weightKg: number | null
  marketValue: number | null
  goalsThisYear: number | null
  totalGoals: number | null
  totalGames: number | null
  nationalGames: number | null
  yearsInProClub: number | null
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
    weightKg: player.weightKg?.toString() ?? '',
    marketValue: player.marketValue != null ? (player.marketValue / 1_000_000).toString() : '',
    goalsThisYear: player.goalsThisYear?.toString() ?? '',
    totalGoals: player.totalGoals?.toString() ?? '',
    totalGames: player.totalGames?.toString() ?? '',
    nationalGames: player.nationalGames?.toString() ?? '',
    yearsInProClub: player.yearsInProClub?.toString() ?? '',
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

  return (
    <>
      <button
        onClick={() => { setOpen(true); setChangedFields(new Set()) }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
        style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        Edit Player
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl p-6 border border-white/10 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-1">Edit Player</h2>
            <p className="text-sm text-white/30 mb-6">Update player information</p>

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

              <div className="grid grid-cols-3 gap-3">
                <Field label="Date of Birth" value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} type="date" />
                <Field label="Height (cm)" value={form.heightCm} onChange={v => set('heightCm', v)} type="number" placeholder="170" />
                <Field label="Weight (kg)" value={form.weightKg} onChange={v => set('weightKg', v)} type="number" placeholder="72" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Market Value (€M)" value={form.marketValue} onChange={v => set('marketValue', v)} type="number" placeholder="50" />
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.playsNational} onChange={e => set('playsNational', e.target.checked)}
                      className="w-4 h-4 rounded accent-[#00c896]" />
                    <span className="text-sm text-white/60">Plays for national team</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <p className="text-xs uppercase tracking-widest text-white/30 mb-3">Career Statistics</p>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Goals This Year" value={form.goalsThisYear} onChange={v => set('goalsThisYear', v)} type="number" />
                  <Field label="Total Goals" value={form.totalGoals} onChange={v => set('totalGoals', v)} type="number" />
                  <Field label="Total Games" value={form.totalGames} onChange={v => set('totalGames', v)} type="number" />
                  <Field label="National Team Games" value={form.nationalGames} onChange={v => set('nationalGames', v)} type="number" />
                  <Field label="Years in Pro Club" value={form.yearsInProClub} onChange={v => set('yearsInProClub', v)} type="number" />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white transition-colors" style={{ background: 'var(--hover-bg)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading || !form.firstName.trim() || !form.lastName.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
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
      <label className="block text-xs text-white/40 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00c896] transition-colors"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
      />
    </div>
  )
}
