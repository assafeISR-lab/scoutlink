'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddPlayerButton({ databaseId }: { databaseId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    firstName: '', lastName: '', position: '', clubName: '',
    nationality: '', dateOfBirth: '', heightCm: '', weightKg: '',
    marketValue: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch(`/api/databases/${databaseId}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        heightCm: form.heightCm ? parseFloat(form.heightCm) : null,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
        marketValue: form.marketValue ? parseFloat(form.marketValue) * 1_000_000 : null,
        dateOfBirth: form.dateOfBirth || null,
      }),
    })

    if (res.ok) {
      setOpen(false)
      setForm({ firstName: '', lastName: '', position: '', clubName: '', nationality: '', dateOfBirth: '', heightCm: '', weightKg: '', marketValue: '' })
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
        Add Player
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl p-6 border border-white/10 max-h-[90vh] overflow-y-auto" style={{ background: '#141720' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-1">Add Player</h2>
            <p className="text-sm text-white/30 mb-6">Enter the player's details</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name *" value={form.firstName} onChange={v => set('firstName', v)} placeholder="Lionel" required />
                <Field label="Last Name *" value={form.lastName} onChange={v => set('lastName', v)} placeholder="Messi" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Position" value={form.position} onChange={v => set('position', v)} placeholder="Forward" />
                <Field label="Club" value={form.clubName} onChange={v => set('clubName', v)} placeholder="Inter Miami" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nationality" value={form.nationality} onChange={v => set('nationality', v)} placeholder="Argentine" />
                <Field label="Date of Birth" value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} type="date" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Height (cm)" value={form.heightCm} onChange={v => set('heightCm', v)} placeholder="170" type="number" />
                <Field label="Weight (kg)" value={form.weightKg} onChange={v => set('weightKg', v)} placeholder="72" type="number" />
                <Field label="Market Value (€M)" value={form.marketValue} onChange={v => set('marketValue', v)} placeholder="50" type="number" />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading || !form.firstName.trim() || !form.lastName.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
                  {loading ? 'Adding...' : 'Add Player'}
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
        style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)' }}
      />
    </div>
  )
}
