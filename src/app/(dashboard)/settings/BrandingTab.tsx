'use client'

import { useState, useEffect, useRef } from 'react'

interface Branding {
  agencyName: string
  logoUrl: string
  phone: string
  email: string
  website: string
  signatureLine: string
}

const EMPTY: Branding = { agencyName: '', logoUrl: '', phone: '', email: '', website: '', signatureLine: '' }

export default function BrandingTab() {
  const [form, setForm]           = useState<Branding>(EMPTY)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')
  const fileInputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/agent/branding')
      .then(r => r.json())
      .then(({ branding }) => {
        if (branding) {
          setForm({
            agencyName:    branding.agencyName    ?? '',
            logoUrl:       branding.logoUrl       ?? '',
            phone:         branding.phone         ?? '',
            email:         branding.email         ?? '',
            website:       branding.website       ?? '',
            signatureLine: branding.signatureLine ?? '',
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function set(key: keyof Branding, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setLogoError('Only image files are allowed'); return }
    if (file.size > 5 * 1024 * 1024) { setLogoError('File too large (max 5 MB)'); return }
    setLogoUploading(true)
    setLogoError('')
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      setForm(f => ({ ...f, logoUrl: dataUrl }))
    } catch {
      setLogoError('Failed to read file')
    } finally {
      setLogoUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/agent/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { setError('Failed to save. Please try again.'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8">
        <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading branding settings…</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>My Branding</h2>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          This information appears on every exported PDF report and shareable link. Set it once — it applies everywhere automatically.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Field label="Agency / Club Name" value={form.agencyName} onChange={v => set('agencyName', v)} placeholder="e.g. Elite Scouts Agency" />

        {/* Logo upload */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Agency Logo</label>
          <div className="flex items-center gap-4">
            {/* Preview */}
            <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}>
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--text-faint)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3 3h18"/>
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { if (!logoUploading) { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                {logoUploading
                  ? <><div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} /> Uploading…</>
                  : <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>{form.logoUrl ? 'Replace Logo' : 'Upload Logo'}</>
                }
              </button>
              {form.logoUrl && (
                <button
                  onClick={() => setForm(f => ({ ...f, logoUrl: '' }))}
                  className="text-xs px-2 py-1 rounded-lg transition-all"
                  style={{ color: 'var(--text-faint)', background: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}>
                  Remove
                </button>
              )}
              <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>PNG, JPG, SVG — max 5 MB</p>
            </div>
          </div>
          {logoError && <p className="text-xs mt-1.5" style={{ color: '#ef4444' }}>{logoError}</p>}
        </div>

        <Field label="Signature Line" value={form.signatureLine} onChange={v => set('signatureLine', v)} placeholder="e.g. Head of Recruitment, Elite Scouts Agency" hint="Shown under your name in report headers." />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone" value={form.phone} onChange={v => set('phone', v)} placeholder="+972 50 000 0000" />
          <Field label="Email" value={form.email} onChange={v => set('email', v)} placeholder="you@agency.com" />
        </div>
        <Field label="Website" value={form.website} onChange={v => set('website', v)} placeholder="https://yourwebsite.com" />
      </div>

      {/* Preview panel */}
      <div className="mt-6 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-2.5" style={{ background: 'var(--subtle-bg)', borderBottom: '1px solid var(--border)' }}>
          <p className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-faint)', letterSpacing: '0.8px' }}>Report Header Preview</p>
        </div>
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#f8fafc' }}>
          <div className="flex items-center gap-3">
            {form.logoUrl && (
              <img src={form.logoUrl} alt="" style={{ height: 36, width: 'auto', objectFit: 'contain', borderRadius: 4 }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            )}
            <div>
              <p className="text-sm font-bold" style={{ color: '#0f172a', margin: 0 }}>{form.agencyName || 'Your Agency Name'}</p>
              {form.signatureLine && <p className="text-xs" style={{ color: '#64748b', margin: 0 }}>{form.signatureLine}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase" style={{ color: '#94a3b8', letterSpacing: '0.8px' }}>Scouting Report</p>
            <p className="text-[10px]" style={{ color: '#94a3b8' }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
        </div>
      )}

      {/* Save */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#fff', boxShadow: '0 2px 12px rgba(0,200,150,0.25)' }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.45)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,200,150,0.25)' }}>
          {saving ? 'Saving…' : 'Save Branding'}
        </button>
        {saved && (
          <span className="text-sm font-medium" style={{ color: '#00c896' }}>✓ Saved</span>
        )}
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
        onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
      />
      {hint && <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>{hint}</p>}
    </div>
  )
}
