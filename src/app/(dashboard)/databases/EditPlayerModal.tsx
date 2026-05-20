'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FMAttributesEditor from '@/components/FMAttributesEditor'
import LinkChips from '@/components/LinkChips'
import { SeasonStatsEditor } from '@/components/SeasonStatsGrid'

// Minimal player shape needed by this modal — matches PlayerRow in DatabasesClient
export interface PlayerForEdit {
  id: string
  databaseId?: string
  firstName: string
  middleName?: string | null
  lastName: string
  position: string | null
  clubName: string | null
  nationality: string | null
  agentName?: string | null
  dateOfBirth: string | null
  heightCm: number | null
  marketValue: number | null
  available: boolean
  playsNational?: boolean
  customFields: { fieldName: string; value: string }[]
}

export interface SavedPlayerFields {
  firstName: string
  middleName: string | null
  lastName: string
  position: string | null
  clubName: string | null
  nationality: string | null
  agentName: string | null
  dateOfBirth: string | null
  heightCm: number | null
  marketValue: number | null
  available: boolean
  playsNational: boolean
  customFields: { fieldName: string; value: string }[]
}

interface EditForm {
  firstName: string; middleName: string; lastName: string
  position: string; clubName: string; nationality: string
  dateOfBirth: string; heightCm: string; marketValue: string
  agentName: string; playsNational: boolean; available: boolean
  foot: string; passports: string; league: string; joiningDate: string
  contractExpiry: string; fmWages: string; transferFeeExpect: string
  transferFeeReal: string; salaryExpect: string; salaryReal: string
  recentForm: string; transfermarktUrl: string; sofascoreUrl: string
  fmInsideUrl: string; instagram: string; twitter: string; tiktok: string
  highlights: string; playerPhone: string; agentPhone: string
  sentBy: string; description: string; fmAttributes: string; seasonStats: string
}

const CUSTOM_FIELD_KEYS: (keyof EditForm)[] = [
  'foot', 'passports', 'league', 'joiningDate', 'contractExpiry',
  'fmWages', 'transferFeeExpect', 'transferFeeReal', 'salaryExpect', 'salaryReal',
  'recentForm', 'transfermarktUrl', 'sofascoreUrl', 'fmInsideUrl',
  'instagram', 'twitter', 'tiktok', 'highlights',
  'playerPhone', 'agentPhone', 'sentBy', 'description', 'fmAttributes', 'seasonStats',
]

function initForm(player: PlayerForEdit): EditForm {
  const cf = (key: string) => player.customFields.find(f => f.fieldName === key)?.value ?? ''
  return {
    firstName:        player.firstName,
    middleName:       player.middleName ?? '',
    lastName:         player.lastName,
    position:         player.position ?? '',
    clubName:         player.clubName ?? '',
    nationality:      player.nationality ?? '',
    dateOfBirth:      player.dateOfBirth ? player.dateOfBirth.split('T')[0] : '',
    heightCm:         player.heightCm?.toString() ?? '',
    marketValue:      player.marketValue != null ? (player.marketValue / 1_000_000).toString() : '',
    agentName:        player.agentName ?? '',
    playsNational:    player.playsNational ?? false,
    available:        player.available,
    foot:             cf('foot'),
    passports:        cf('passports'),
    league:           cf('league'),
    joiningDate:      cf('joiningDate'),
    contractExpiry:   cf('contractExpiry'),
    fmWages:          cf('fmWages'),
    transferFeeExpect: cf('transferFeeExpect'),
    transferFeeReal:  cf('transferFeeReal'),
    salaryExpect:     cf('salaryExpect'),
    salaryReal:       cf('salaryReal'),
    recentForm:       cf('recentForm'),
    transfermarktUrl: cf('transfermarktUrl'),
    sofascoreUrl:     cf('sofascoreUrl'),
    fmInsideUrl:      cf('fmInsideUrl'),
    instagram:        cf('instagram'),
    twitter:          cf('twitter'),
    tiktok:           cf('tiktok'),
    highlights:       cf('highlights'),
    playerPhone:      cf('playerPhone'),
    agentPhone:       cf('agentPhone'),
    sentBy:           cf('sentBy'),
    description:      cf('description'),
    fmAttributes:     cf('fmAttributes'),
    seasonStats:      cf('seasonStats') || '{"seasons":[]}',
  }
}

interface Props {
  player: PlayerForEdit
  singleId?: string
  onClose: () => void
  onSaved: (updated: SavedPlayerFields) => void
}

export default function EditPlayerModal({ player, singleId, onClose, onSaved }: Props) {
  const dbId = player.databaseId ?? singleId ?? ''
  const router = useRouter()
  const [form, setForm] = useState<EditForm>(() => initForm(player))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof EditForm, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('First and last name are required'); return }
    setLoading(true); setError('')

    const customFields: Record<string, string> = {}
    for (const key of CUSTOM_FIELD_KEYS) {
      const val = form[key]
      customFields[key as string] = typeof val === 'string' ? val.trim() : ''
    }

    const res = await fetch(`/api/databases/${dbId}/players/${player.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName:    form.firstName.trim(),
        middleName:   form.middleName.trim() || null,
        lastName:     form.lastName.trim(),
        position:     form.position.trim() || null,
        clubName:     form.clubName.trim() || null,
        nationality:  form.nationality.trim() || null,
        dateOfBirth:  form.dateOfBirth || null,
        heightCm:     form.heightCm ? parseFloat(form.heightCm) : null,
        marketValue:  form.marketValue ? parseFloat(form.marketValue) : null,
        agentName:    form.agentName.trim() || null,
        playsNational: form.playsNational,
        available:    form.available,
        changedFields: [],
        customFields,
      }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Failed to save')
      setLoading(false)
      return
    }

    const updatedCf = Object.entries(customFields)
      .filter(([, v]) => v !== '')
      .map(([fieldName, value]) => ({ fieldName, value }))

    onSaved({
      firstName:    form.firstName.trim(),
      middleName:   form.middleName.trim() || null,
      lastName:     form.lastName.trim(),
      position:     form.position.trim() || null,
      clubName:     form.clubName.trim() || null,
      nationality:  form.nationality.trim() || null,
      agentName:    form.agentName.trim() || null,
      dateOfBirth:  form.dateOfBirth || null,
      heightCm:     form.heightCm ? parseFloat(form.heightCm) : null,
      marketValue:  form.marketValue ? parseFloat(form.marketValue) * 1_000_000 : null,
      available:    form.available,
      playsNational: form.playsNational,
      customFields: updatedCf,
    })
    router.refresh()
    setLoading(false)
    onClose()
  }

  const age = form.dateOfBirth
    ? Math.floor((Date.now() - new Date(form.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null
  const initials = ((form.firstName[0] ?? player.firstName[0]) + (form.lastName[0] ?? player.lastName[0])).toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div
        className="w-full max-w-7xl max-h-[95vh] overflow-y-auto rounded-2xl"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10" style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Player</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>Update the player's details below</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        {/* Player Card */}
        <div className="m-5 rounded-2xl overflow-hidden" style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}>

          {/* Card Header */}
          <div className="flex items-start gap-4" style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-black flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', boxShadow: '0 0 16px rgba(0,200,150,0.3)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <input autoFocus value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name *"
                  className="bg-transparent focus:outline-none border-b border-transparent focus:border-[#00c896] transition-colors"
                  style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-primary)', caretColor: '#00c896', width: 140 }} />
                <input value={form.middleName} onChange={e => set('middleName', e.target.value)} placeholder="Middle"
                  className="bg-transparent focus:outline-none border-b border-transparent focus:border-[#00c896] transition-colors"
                  style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-primary)', caretColor: '#00c896', width: 90 }} />
                <input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last name *"
                  className="bg-transparent focus:outline-none border-b border-transparent focus:border-[#00c896] transition-colors"
                  style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-primary)', caretColor: '#00c896', width: 140 }} />
              </div>
              <div className="flex items-center flex-wrap" style={{ gap: '4px 6px' }}>
                <input value={form.position} onChange={e => set('position', e.target.value)} placeholder="Position"
                  className="text-xs px-2 py-0.5 rounded-full font-medium focus:outline-none transition-colors"
                  style={{ background: '#00c89615', color: '#00c896', border: '1px solid #00c89630', caretColor: '#00c896', width: form.position ? `${Math.max(70, form.position.length * 8)}px` : '80px' }} />
                {form.clubName    && <><span style={{ color: 'var(--text-faint)' }}>·</span><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{form.clubName}</span></>}
                {form.league      && <><span style={{ color: 'var(--text-faint)' }}>·</span><span className="text-xs" style={{ color: '#00c896' }}>{form.league}</span></>}
                {form.nationality && <><span style={{ color: 'var(--text-faint)' }}>·</span><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{form.nationality}</span></>}
                {age !== null     && <><span style={{ color: 'var(--text-faint)' }}>·</span><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{age} yrs</span></>}
              </div>
            </div>
          </div>

          {/* 3-column body */}
          <div className="grid grid-cols-3">

            {/* Physical */}
            <div className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
              <p className="text-[9px] uppercase font-bold mb-3" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Physical</p>
              <div>
                <CardRow label="Nationality"><CardInput value={form.nationality} onChange={v => set('nationality', v)} placeholder="e.g. Spanish" /></CardRow>
                <CardRow label="Date of Birth"><DateInput value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} /></CardRow>
                <CardRow label="Age"><span className="text-[11px] font-medium" style={{ color: 'var(--text-faint)' }}>{age !== null ? `${age} yrs` : '—'}</span></CardRow>
                <CardRow label="Height (cm)"><CardInput value={form.heightCm} onChange={v => set('heightCm', v)} placeholder="e.g. 182" type="number" /></CardRow>
                <CardRow label="Preferred Foot">
                  <select value={form.foot} onChange={e => set('foot', e.target.value)}
                    className="text-[11px] font-medium text-right bg-transparent focus:outline-none transition-all rounded px-1.5 py-0.5"
                    style={{ width: 90, color: form.foot ? 'var(--text-primary)' : 'var(--text-faint)', border: '1px solid transparent' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'; e.currentTarget.style.background = 'rgba(0,200,150,0.06)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}>
                    <option value="">—</option>
                    <option value="Right">Right</option>
                    <option value="Left">Left</option>
                    <option value="Both">Both</option>
                  </select>
                </CardRow>
                <CardRow label="Passports"><CardInput value={form.passports} onChange={v => set('passports', v)} placeholder="e.g. ES, IT" /></CardRow>
                <CardRow label="Player Phone"><CardInput value={form.playerPhone} onChange={v => set('playerPhone', v)} placeholder="+1 …" /></CardRow>
              </div>
            </div>

            {/* Contract & Value */}
            <div className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
              <p className="text-[9px] uppercase font-bold mb-3" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Contract & Value</p>
              <div>
                <CardRow label="Club"><CardInput value={form.clubName} onChange={v => set('clubName', v)} placeholder="e.g. Arsenal" /></CardRow>
                <CardRow label="League"><CardInput value={form.league} onChange={v => set('league', v)} placeholder="e.g. Premier League" /></CardRow>
                <CardRow label="Joining Date"><DateInput value={form.joiningDate} onChange={v => set('joiningDate', v)} /></CardRow>
                <CardRow label="Contract Expiry"><DateInput value={form.contractExpiry} onChange={v => set('contractExpiry', v)} /></CardRow>
                <CardRow label="Market Value (€M)" highlight><CardInput value={form.marketValue} onChange={v => set('marketValue', v)} placeholder="e.g. 25" type="number" highlight /></CardRow>
                <CardRow label="FM Wages"><CardInput value={form.fmWages} onChange={v => set('fmWages', v)} placeholder="e.g. 45000" type="number" /></CardRow>
                <CardRow label="Fee Expectation"><CardInput value={form.transferFeeExpect} onChange={v => set('transferFeeExpect', v)} placeholder="e.g. 20M" /></CardRow>
                <CardRow label="Fee (Real)"><CardInput value={form.transferFeeReal} onChange={v => set('transferFeeReal', v)} placeholder="e.g. 18M" /></CardRow>
                <CardRow label="Salary Expectation"><CardInput value={form.salaryExpect} onChange={v => set('salaryExpect', v)} placeholder="e.g. 80K/w" /></CardRow>
                <CardRow label="Salary (Real)"><CardInput value={form.salaryReal} onChange={v => set('salaryReal', v)} placeholder="e.g. 72K/w" /></CardRow>
              </div>
            </div>

            {/* Scout Info */}
            <div className="p-4">
              <p className="text-[9px] uppercase font-bold mb-3" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Scout Info</p>
              <div>
                <CardRow label="Availability">
                  <button type="button" onClick={() => set('available', !form.available)}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all"
                    style={{
                      background: form.available ? 'rgba(0,200,150,0.12)' : 'rgba(255,80,80,0.1)',
                      color: form.available ? '#00c896' : '#ff6464',
                      border: `1px solid ${form.available ? 'rgba(0,200,150,0.3)' : 'rgba(255,80,80,0.25)'}`,
                    }}>
                    {form.available ? 'Available' : 'Not Available'}
                  </button>
                </CardRow>
                <CardRow label="Agent"><CardInput value={form.agentName} onChange={v => set('agentName', v)} placeholder="Agent name" /></CardRow>
                <CardRow label="Agent Phone"><CardInput value={form.agentPhone} onChange={v => set('agentPhone', v)} placeholder="+1 …" /></CardRow>
                <CardRow label="Referral"><CardInput value={form.sentBy} onChange={v => set('sentBy', v)} placeholder="Who sent this lead" /></CardRow>
                <CardRow label="Plays National">
                  <button type="button" onClick={() => set('playsNational', !form.playsNational)}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full transition-all"
                    style={{
                      background: form.playsNational ? '#00c896' : 'var(--hover-bg)',
                      color: form.playsNational ? '#fff' : 'var(--text-faint)',
                      border: `1px solid ${form.playsNational ? '#00c896' : 'var(--border)'}`,
                    }}>
                    {form.playsNational ? 'Yes' : 'No'}
                  </button>
                </CardRow>
                <CardRow label="Recent Form"><CardInput value={form.recentForm} onChange={v => set('recentForm', v)} placeholder="e.g. WWDLW" /></CardRow>
                <LinkChips canEdit links={[
                  { label: 'Transfermarkt', value: form.transfermarktUrl, onChange: v => set('transfermarktUrl', v) },
                  { label: 'Sofascore',     value: form.sofascoreUrl,     onChange: v => set('sofascoreUrl', v) },
                  { label: 'FMInside',      value: form.fmInsideUrl,      onChange: v => set('fmInsideUrl', v) },
                  { label: 'Instagram',     value: form.instagram,        onChange: v => set('instagram', v) },
                  { label: 'Twitter / X',   value: form.twitter,          onChange: v => set('twitter', v) },
                  { label: 'TikTok',        value: form.tiktok,           onChange: v => set('tiktok', v) },
                  { label: 'Highlights',    value: form.highlights,       onChange: v => set('highlights', v) },
                ]} />
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <p className="text-[9px] uppercase font-semibold mb-1.5" style={{ color: 'var(--text-faint)', letterSpacing: '0.7px' }}>Description</p>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)}
                    placeholder="Notes on this player…" rows={3}
                    className="w-full text-[11px] focus:outline-none resize-none transition-all"
                    style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.35)', color: 'var(--text-primary)', caretColor: '#00c896', borderRadius: 7, padding: '7px 9px', minHeight: 64, lineHeight: 1.55 }}
                    onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'} />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom section */}
          <div className="grid grid-cols-3" style={{ background: 'var(--subtle-bg)', borderTop: '1px solid var(--border)' }}>
            <div className="p-4 flex flex-col gap-2" style={{ borderRight: '1px solid var(--border)' }}>
              <p className="text-[9px] uppercase font-bold" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Heat Map</p>
              <div className="flex flex-col items-center justify-center gap-2 flex-1 rounded-lg" style={{ minHeight: 80, border: '1px dashed var(--border)' }}>
                <span style={{ fontSize: 28, opacity: 0.25 }}>🗺️</span>
                <span className="text-[10px] text-center" style={{ color: 'var(--text-faint)' }}>Position heat map coming soon</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(139,92,246,0.08)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.2)' }}>Coming Soon</span>
              </div>
            </div>
            <div className="p-4 flex flex-col gap-2" style={{ borderRight: '1px solid var(--border)' }}>
              <p className="text-[9px] uppercase font-bold" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Season Stats</p>
              <SeasonStatsEditor json={form.seasonStats} onChange={v => set('seasonStats', v)} />
            </div>
            <div className="p-4 flex flex-col gap-2">
              <p className="text-[9px] uppercase font-bold" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>FM Attributes</p>
              <FMAttributesEditor value={form.fmAttributes} onChange={v => set('fmAttributes', v)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex flex-col gap-3">
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading || !form.firstName.trim() || !form.lastName.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared card helpers ───────────────────────────────────────────────────────

function CardRow({ label, children, highlight = false }: { label: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2" style={{ borderBottom: '1px solid var(--border)', padding: '4px 0' }}>
      <span className="text-[11px] flex-shrink-0" style={{ color: highlight ? '#00c896' : 'var(--text-muted)' }}>{label}</span>
      <div className="flex items-center justify-end">{children}</div>
    </div>
  )
}

function CardInput({ value, onChange, placeholder, type = 'text', highlight = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; highlight?: boolean
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? '—'}
      className="text-[11px] font-medium text-right bg-transparent focus:outline-none transition-all rounded px-1.5 py-0.5"
      style={{ width: 110, color: highlight ? '#00c896' : value ? 'var(--text-primary)' : 'var(--text-faint)', border: '1px solid transparent', caretColor: '#00c896' }}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'; e.currentTarget.style.background = 'rgba(0,200,150,0.06)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
    />
  )
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input type="date" value={value} onChange={e => onChange(e.target.value)}
      className="text-[11px] font-medium text-right bg-transparent focus:outline-none transition-all rounded px-1.5 py-0.5"
      style={{ width: 120, color: value ? 'var(--text-primary)' : 'var(--text-faint)', border: '1px solid transparent', caretColor: '#00c896', colorScheme: 'dark' }}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.35)'; e.currentTarget.style.background = 'rgba(0,200,150,0.06)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
    />
  )
}
