'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Form {
  // DB model fields
  firstName: string
  lastName: string
  position: string
  clubName: string
  nationality: string
  dateOfBirth: string
  heightCm: string
  weightKg: string
  marketValue: string
  // Custom fields (stored in CustomField table)
  foot: string
  passports: string
  league: string
  joiningDate: string
  contractExpiry: string
  fmWages: string
  transferFeeExpect: string
  transferFeeReal: string
  salaryExpect: string
  salaryReal: string
  recentForm: string
  transfermarktUrl: string
  sofascoreUrl: string
  instagram: string
  highlights: string
}

const EMPTY: Form = {
  firstName: '', lastName: '', position: '', clubName: '',
  nationality: '', dateOfBirth: '', heightCm: '', weightKg: '', marketValue: '',
  foot: '', passports: '', league: '', joiningDate: '', contractExpiry: '',
  fmWages: '', transferFeeExpect: '', transferFeeReal: '',
  salaryExpect: '', salaryReal: '', recentForm: '',
  transfermarktUrl: '', sofascoreUrl: '', instagram: '', highlights: '',
}

const CUSTOM_FIELD_KEYS: (keyof Form)[] = [
  'foot', 'passports', 'league', 'joiningDate', 'contractExpiry',
  'fmWages', 'transferFeeExpect', 'transferFeeReal', 'salaryExpect', 'salaryReal',
  'recentForm', 'transfermarktUrl', 'sofascoreUrl', 'instagram', 'highlights',
]

export default function AddPlayerButton({ databaseId }: { databaseId: string }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState<Form>(EMPTY)
  const router = useRouter()

  function set(field: keyof Form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleClose() { setOpen(false); setForm(EMPTY); setError('') }

  async function handleSubmit() {
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('First and last name are required'); return }
    setLoading(true); setError('')

    // Build custom fields object (only non-empty values)
    const customFields: Record<string, string> = {}
    for (const key of CUSTOM_FIELD_KEYS) {
      const val = form[key]
      if (val && val.trim()) customFields[key] = val.trim()
    }

    const res = await fetch(`/api/databases/${databaseId}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName:   form.firstName.trim(),
        lastName:    form.lastName.trim(),
        position:    form.position.trim() || null,
        clubName:    form.clubName.trim() || null,
        nationality: form.nationality.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        heightCm:    form.heightCm    ? parseFloat(form.heightCm)    : null,
        weightKg:    form.weightKg    ? parseFloat(form.weightKg)     : null,
        marketValue: form.marketValue ? parseFloat(form.marketValue) * 1_000_000 : null,
        customFields,
      }),
    })
    if (res.ok) { handleClose(); router.refresh() }
    else { const d = await res.json(); setError(d.error || 'Something went wrong') }
    setLoading(false)
  }

  const initials = (form.firstName[0] ?? '?') + (form.lastName[0] ?? '?')
  const age = form.dateOfBirth
    ? Math.floor((Date.now() - new Date(form.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null
  const hasName = form.firstName.trim() || form.lastName.trim()

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={handleClose}>
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10"
            style={{ background: 'var(--card-bg)' }}
            onClick={e => e.stopPropagation()}
          >

            {/* ── Modal header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <h2 className="text-base font-semibold text-white">Add Player</h2>
                <p className="text-xs text-white/30 mt-0.5">Fill in the player card below</p>
              </div>
              <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white transition-colors" style={{ background: 'var(--hover-bg)' }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>

            {/* ── Player Card ── */}
            <div className="m-5 rounded-2xl overflow-hidden border border-white/5" style={{ background: 'var(--subtle-bg)' }}>

              {/* Card Header */}
              <div className="flex items-center gap-4 p-5 border-b border-white/5">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-black flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', boxShadow: '0 0 16px rgba(0,200,150,0.3)' }}>
                  {initials.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <input autoFocus value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name *"
                      className="text-lg font-bold bg-transparent focus:outline-none text-white placeholder-white/20 border-b border-transparent focus:border-[#00c896] transition-colors w-[140px]"
                      style={{ caretColor: '#00c896' }} />
                    <input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last name *"
                      className="text-lg font-bold bg-transparent focus:outline-none text-white placeholder-white/20 border-b border-transparent focus:border-[#00c896] transition-colors w-[140px]"
                      style={{ caretColor: '#00c896' }} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <input value={form.position} onChange={e => set('position', e.target.value)} placeholder="Position"
                        className="text-xs px-2 py-0.5 rounded-full font-medium focus:outline-none placeholder-[#00c89660] transition-colors"
                        style={{ background: '#00c89615', color: '#00c896', border: '1px solid #00c89630', caretColor: '#00c896', width: form.position ? `${Math.max(70, form.position.length * 8)}px` : '80px' }} />
                    </div>
                    {form.clubName    && <span className="text-xs text-white/50">{form.clubName}</span>}
                    {form.nationality && <span className="text-xs text-white/30">{form.nationality}</span>}
                    {age !== null     && <span className="text-xs text-white/30">{age} yrs</span>}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896' }}>New Player</span>
                </div>
              </div>

              {/* 3-column body */}
              <div className="grid grid-cols-3">

                {/* Physical */}
                <div className="p-4 border-r border-white/5">
                  <p className="text-[10px] uppercase tracking-widest mb-3 font-medium text-white/25">Physical</p>
                  <div className="space-y-2.5">
                    <CardRow label="Nationality">
                      <CardInput value={form.nationality} onChange={v => set('nationality', v)} placeholder="e.g. Spanish" />
                    </CardRow>
                    <CardRow label="Date of Birth">
                      <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)}
                        className="text-[11px] font-medium text-right bg-transparent focus:outline-none text-white/70 placeholder-white/20 transition-all rounded px-1.5 py-0.5 focus:bg-[rgba(0,200,150,0.06)] focus:border-[rgba(0,200,150,0.35)]"
                        style={{ width: 110, border: '1px solid transparent', caretColor: '#00c896', colorScheme: 'dark' }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'; e.currentTarget.style.background = 'rgba(0,200,150,0.06)' }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
                      />
                    </CardRow>
                    <CardRow label="Height (cm)">
                      <CardInput value={form.heightCm} onChange={v => set('heightCm', v)} placeholder="e.g. 182" type="number" />
                    </CardRow>
                    <CardRow label="Weight (kg)">
                      <CardInput value={form.weightKg} onChange={v => set('weightKg', v)} placeholder="e.g. 76" type="number" />
                    </CardRow>
                    <CardRow label="Age">
                      <span className="text-[11px] font-medium text-white/40">{age !== null ? `${age} yrs` : '—'}</span>
                    </CardRow>
                    <CardRow label="Preferred Foot">
                      <select value={form.foot} onChange={e => set('foot', e.target.value)}
                        className="text-[11px] font-medium text-right bg-transparent focus:outline-none transition-all rounded px-1.5 py-0.5"
                        style={{ width: 90, color: form.foot ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)', border: '1px solid transparent', caretColor: '#00c896', colorScheme: 'dark', background: 'transparent' }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'; e.currentTarget.style.background = 'rgba(0,200,150,0.06)' }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
                      >
                        <option value="" style={{ color: '#000' }}>—</option>
                        <option value="Right" style={{ color: '#000' }}>Right</option>
                        <option value="Left"  style={{ color: '#000' }}>Left</option>
                        <option value="Both"  style={{ color: '#000' }}>Both</option>
                      </select>
                    </CardRow>
                    <CardRow label="Passports">
                      <CardInput value={form.passports} onChange={v => set('passports', v)} placeholder="e.g. ES, IT" />
                    </CardRow>
                  </div>
                </div>

                {/* Contract & Value */}
                <div className="p-4 border-r border-white/5">
                  <p className="text-[10px] uppercase tracking-widest mb-3 font-medium text-white/25">Contract & Value</p>
                  <div className="space-y-2.5">
                    <CardRow label="Club">
                      <CardInput value={form.clubName} onChange={v => set('clubName', v)} placeholder="e.g. Arsenal" />
                    </CardRow>
                    <CardRow label="League">
                      <CardInput value={form.league} onChange={v => set('league', v)} placeholder="e.g. Premier League" />
                    </CardRow>
                    <CardRow label="Joining Date">
                      <input type="date" value={form.joiningDate} onChange={e => set('joiningDate', e.target.value)}
                        className="text-[11px] font-medium text-right bg-transparent focus:outline-none text-white/70 transition-all rounded px-1.5 py-0.5"
                        style={{ width: 110, border: '1px solid transparent', caretColor: '#00c896', colorScheme: 'dark' }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'; e.currentTarget.style.background = 'rgba(0,200,150,0.06)' }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
                      />
                    </CardRow>
                    <CardRow label="Contract Expiry">
                      <input type="date" value={form.contractExpiry} onChange={e => set('contractExpiry', e.target.value)}
                        className="text-[11px] font-medium text-right bg-transparent focus:outline-none text-white/70 transition-all rounded px-1.5 py-0.5"
                        style={{ width: 110, border: '1px solid transparent', caretColor: '#00c896', colorScheme: 'dark' }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'; e.currentTarget.style.background = 'rgba(0,200,150,0.06)' }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
                      />
                    </CardRow>
                    <CardRow label="Market Value (€M)" highlight>
                      <CardInput value={form.marketValue} onChange={v => set('marketValue', v)} placeholder="e.g. 25" type="number" highlight />
                    </CardRow>
                    <CardRow label="FM Wages">
                      <CardInput value={form.fmWages} onChange={v => set('fmWages', v)} placeholder="e.g. 45000" type="number" />
                    </CardRow>
                    <CardRow label="Fee Expectation">
                      <CardInput value={form.transferFeeExpect} onChange={v => set('transferFeeExpect', v)} placeholder="e.g. 20M" />
                    </CardRow>
                    <CardRow label="Salary Expectation">
                      <CardInput value={form.salaryExpect} onChange={v => set('salaryExpect', v)} placeholder="e.g. 80K/w" />
                    </CardRow>
                  </div>
                </div>

                {/* Scout Info */}
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-widest mb-3 font-medium text-white/25">Scout Info</p>
                  <div className="space-y-2.5">
                    <CardRow label="Position">
                      <CardInput value={form.position} onChange={v => set('position', v)} placeholder="e.g. CAM" />
                    </CardRow>
                    <CardRow label="Added">
                      <span className="text-[11px] font-medium text-white/40">
                        {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </CardRow>
                    <CardRow label="Recent Form">
                      <CardInput value={form.recentForm} onChange={v => set('recentForm', v)} placeholder="e.g. WWDLW" />
                    </CardRow>
                    <CardRow label="Transfermarkt">
                      <CardInput value={form.transfermarktUrl} onChange={v => set('transfermarktUrl', v)} placeholder="https://…" />
                    </CardRow>
                    <CardRow label="Sofascore">
                      <CardInput value={form.sofascoreUrl} onChange={v => set('sofascoreUrl', v)} placeholder="https://…" />
                    </CardRow>
                    <CardRow label="Instagram">
                      <CardInput value={form.instagram} onChange={v => set('instagram', v)} placeholder="@username" />
                    </CardRow>
                    <CardRow label="Highlights">
                      <CardInput value={form.highlights} onChange={v => set('highlights', v)} placeholder="https://…" />
                    </CardRow>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="px-6 pb-5 flex flex-col gap-3">
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-3">
                <button onClick={handleClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 transition-colors" style={{ background: 'var(--hover-bg)' }}>
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={loading || !form.firstName.trim() || !form.lastName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
                  {loading ? 'Adding...' : `Add ${hasName ? (form.firstName + ' ' + form.lastName).trim() : 'Player'}`}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}

// ── Card helpers ──────────────────────────────────────────────────────────────

function CardRow({ label, children, highlight = false }: { label: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-[11px] flex-shrink-0 ${highlight ? 'text-white/50' : 'text-white/30'}`}>{label}</span>
      <div className="flex items-center justify-end">{children}</div>
    </div>
  )
}

function CardInput({ value, onChange, placeholder, type = 'text', highlight = false }: {
  value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; highlight?: boolean
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? '—'}
      className={`text-[11px] font-medium text-right bg-transparent focus:outline-none transition-all rounded px-1.5 py-0.5 placeholder-white/20 ${
        highlight ? 'text-[#00c896]' : value ? 'text-white/80' : 'text-white/25'
      }`}
      style={{ width: 110, border: '1px solid transparent', caretColor: '#00c896' }}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'; e.currentTarget.style.background = 'rgba(0,200,150,0.06)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
    />
  )
}
