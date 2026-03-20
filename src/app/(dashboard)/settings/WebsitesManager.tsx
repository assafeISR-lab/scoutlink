'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BrowseFootballSites from './BrowseFootballSites'
import { getCountryFlag } from '@/lib/footballAssociations'

interface Website {
  id: string
  name: string
  url: string
  requiresLogin: boolean
  username: string | null
  password: string | null
  isActive: boolean
  country: string | null
  category: string | null
}

export default function WebsitesManager({ websites }: { websites: Website[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [showBrowse, setShowBrowse] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()

  async function handleBrowseAdd(site: { name: string; url: string; country: string; category: string; requiresLogin: boolean }) {
    const res = await fetch('/api/websites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(site),
    })
    if (!res.ok) {
      const text = await res.text()
      alert(`Failed to add (${res.status}): ${text.slice(0, 200)}`)
      return
    }
    router.refresh()
  }

  // Filter websites
  const filtered = websites.filter(w =>
    search === '' ||
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.url.toLowerCase().includes(search.toLowerCase()) ||
    (w.country ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // Group by country
  const grouped: Record<string, Website[]> = {}
  filtered.forEach(w => {
    const key = w.country ?? 'General'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(w)
  })
  const sortedGroups = Object.keys(grouped).sort((a, b) => a === 'General' ? 1 : b === 'General' ? -1 : a.localeCompare(b))

  return (
    <div className="rounded-2xl border border-white/5 overflow-hidden" style={{
      background: 'linear-gradient(135deg, #141720 0%, #111318 100%)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    }}>
      {/* Section header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#6c8fff15', border: '1px solid #6c8fff30' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#6c8fff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Scouting Websites</h2>
            <p className="text-xs text-white/30">{websites.length} website{websites.length !== 1 ? 's' : ''} configured</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBrowse(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'rgba(108,143,255,0.12)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.2)' }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            Browse Football Sites
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-black"
            style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Add Custom
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-6 py-3 border-b border-white/5" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search websites, countries..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs text-white placeholder-white/20 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <StatusBadge free />
          <span className="text-xs text-white/30">Free</span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge free={false} />
          <span className="text-xs text-white/30">Login required</span>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-3 divide-x divide-white/5">
        {[
          { key: null, label: 'General', icon: '🌐', color: '#00c896' },
          { key: 'association', label: 'Associations', icon: '🏛', color: '#6c8fff' },
          { key: 'club', label: 'Clubs', icon: '⚽', color: '#ff9f43' },
        ].map(col => {
          const sites = filtered.filter(w =>
            col.key === null ? (!w.category || w.category === 'other') : w.category === col.key
          )
          return (
            <div key={col.label} className="flex flex-col min-h-[200px]">
              {/* Column header */}
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span className="text-sm">{col.icon}</span>
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: col.color }}>{col.label}</span>
                <span className="text-[10px] text-white/20 ml-auto">{sites.length}</span>
              </div>
              {/* Sites */}
              <div className="flex-1 divide-y divide-white/5">
                {sites.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs text-white/15">No sites yet</p>
                  </div>
                ) : (
                  sites.map(site => (
                    <WebsiteRow key={site.id} site={site} onUpdate={() => router.refresh()} compact />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showBrowse && <BrowseFootballSites onClose={() => setShowBrowse(false)} onAdd={handleBrowseAdd} />}
      {showAdd && <AddWebsiteModal onClose={() => setShowAdd(false)} onSave={() => { setShowAdd(false); router.refresh() }} />}
    </div>
  )
}

function StatusBadge({ free }: { free: boolean }) {
  return free ? (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.25)' }}>
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      Free
    </span>
  ) : (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
      Login Required
    </span>
  )
}

function WebsiteRow({ site, onUpdate, compact }: { site: Website; onUpdate: () => void; compact?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  async function toggleActive() {
    setLoading(true)
    await fetch(`/api/websites/${site.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !site.isActive }),
    })
    setLoading(false)
    onUpdate()
  }

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/websites/${site.id}`, { method: 'DELETE' })
    setLoading(false)
    onUpdate()
  }

  if (editing) {
    return <EditWebsiteRow site={site} onDone={() => { setEditing(false); onUpdate() }} />
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 group transition-all ${!site.isActive ? 'opacity-40' : ''}`}>
      {/* Favicon */}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <img
          src={`https://www.google.com/s2/favicons?domain=${new URL(site.url).hostname}&sz=32`}
          alt=""
          className="w-4 h-4"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <p className="text-xs font-medium text-white truncate">{site.name}</p>
          <StatusBadge free={!site.requiresLogin} />
          {!site.isActive && <span className="text-[10px] text-white/20 uppercase tracking-wide">Disabled</span>}
        </div>
        {site.country ? (
          <div className="flex items-center gap-1 mt-0.5">
            <img
              src={`https://flagcdn.com/20x15/${getCountryFlag(site.country)}.png`}
              alt={site.country}
              className="w-4 h-3 object-cover rounded-sm flex-shrink-0"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
            <span className="text-[10px] text-white/40">{site.country}</span>
          </div>
        ) : (
          <p className="text-[10px] text-white/20 truncate">{new URL(site.url).hostname.replace('www.', '')}</p>
        )}
      </div>

      {/* Actions — icon buttons on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => setEditing(true)} title="Edit" className="w-6 h-6 flex items-center justify-center rounded text-white/30 hover:text-white/70 transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        </button>
        <button onClick={toggleActive} disabled={loading} title={site.isActive ? 'Disable' : 'Enable'} className="w-6 h-6 flex items-center justify-center rounded text-white/30 hover:text-yellow-400 transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d={site.isActive ? "M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" : "M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"}/></svg>
        </button>
        <button onClick={handleDelete} disabled={loading} title="Delete" className="w-6 h-6 flex items-center justify-center rounded text-white/30 hover:text-red-400 transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>
    </div>
  )
}

function EditWebsiteRow({ site, onDone }: { site: Website; onDone: () => void }) {
  const [form, setForm] = useState({ name: site.name, url: site.url, requiresLogin: site.requiresLogin, username: site.username ?? '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    await fetch(`/api/websites/${site.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    onDone()
  }

  return (
    <div className="px-6 py-4 border-l-2" style={{ borderColor: '#00c896', background: 'rgba(0,200,150,0.03)' }}>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
        <Field label="URL" value={form.url} onChange={v => setForm(f => ({ ...f, url: v }))} />
      </div>
      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.requiresLogin} onChange={e => setForm(f => ({ ...f, requiresLogin: e.target.checked }))} className="accent-[#00c896]" />
          <span className="text-xs text-white/50">Requires login</span>
        </label>
      </div>
      {form.requiresLogin && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Username" value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))} />
          <Field label="Password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} type="password" placeholder="Leave blank to keep existing" />
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={onDone} className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70">Cancel</button>
        <button onClick={handleSave} disabled={loading} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black disabled:opacity-50" style={{ background: '#00c896' }}>
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function AddWebsiteModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ name: '', url: '', requiresLogin: false, username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.name.trim() || !form.url.trim()) { setError('Name and URL are required'); return }
    setLoading(true)
    const res = await fetch('/api/websites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { onSave() } else { const d = await res.json(); setError(d.error || 'Error'); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 border border-white/10" style={{ background: '#141720' }} onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-5">Add Website</h2>
        <div className="flex flex-col gap-3">
          <Field label="Website Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. WhoScored" />
          <Field label="URL" value={form.url} onChange={v => setForm(f => ({ ...f, url: v }))} placeholder="https://www.whoscored.com" />
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input type="checkbox" checked={form.requiresLogin} onChange={e => setForm(f => ({ ...f, requiresLogin: e.target.checked }))} className="accent-[#00c896]" />
            <span className="text-sm text-white/50">This website requires login</span>
          </label>
          {form.requiresLogin && (
            <>
              <Field label="Username" value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))} />
              <Field label="Password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} type="password" />
            </>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 mt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
            <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
              {loading ? 'Adding...' : 'Add Website'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-white/40 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
        style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)' }}
        onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
      />
    </div>
  )
}
