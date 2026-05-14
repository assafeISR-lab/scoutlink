'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchAllLists from './SearchAllLists'

type DbItem = {
  id: string
  name: string
  playerCount: number
  sharedWith: number
  permission: string
  ownerName?: string
  createdAt: string
}

export default function DatabasesClient({
  ownedDbs,
  sharedDbs,
}: {
  ownedDbs: DbItem[]
  sharedDbs: DbItem[]
}) {
  return (
    <>
      <ScoutAIBar />
      <SearchAllLists />

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">
          My Lists ({ownedDbs.length})
        </h2>
        {ownedDbs.length === 0 ? (
          <EmptyState message="You haven't created any lists yet." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownedDbs.map(db => <DatabaseCard key={db.id} {...db} />)}
          </div>
        )}
      </section>

      {sharedDbs.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">
            Shared With Me ({sharedDbs.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedDbs.map(db => <DatabaseCard key={db.id} {...db} />)}
          </div>
        </section>
      )}
    </>
  )
}

function DatabaseCard({ id, name, playerCount, sharedWith, permission, ownerName, createdAt }: DbItem) {
  const isOwner = permission === 'owner'
  const color = isOwner ? '#00c896' : '#6c8fff'
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeleting(true)
    await fetch(`/api/databases/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="relative group">
      <a
        href={`/databases/${id}`}
        className="block rounded-2xl border border-white/5 p-5 transition-all duration-200 hover:border-white/10 hover:scale-[1.01]"
        style={{ background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill={color}>
              <path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4S4 11.21 4 9zm0 5v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] px-2 py-1 rounded-full font-medium uppercase tracking-wide"
              style={{ background: `${color}15`, color }}
            >
              {isOwner ? 'Owner' : permission}
            </span>
            {isOwner && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirming(true) }}
                className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                title="Delete list"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <h3 className="text-base font-semibold text-white mb-1 truncate">{name}</h3>
        {ownerName && <p className="text-xs text-white/30 mb-3">by {ownerName}</p>}

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
          <div>
            <p className="text-xl font-bold text-white">{playerCount}</p>
            <p className="text-[10px] text-white/30">Players</p>
          </div>
          {isOwner && sharedWith > 0 && (
            <div>
              <p className="text-xl font-bold text-white">{sharedWith}</p>
              <p className="text-[10px] text-white/30">Shared</p>
            </div>
          )}
          <div className="ml-auto">
            <p className="text-[10px] text-white/20">{new Date(createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </a>

      {confirming && (
        <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 p-5 z-10"
          style={{ background: 'rgba(10,12,18,0.97)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#ef4444">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <p className="text-sm font-semibold text-white text-center">Delete &ldquo;{name}&rdquo;?</p>
          <p className="text-xs text-white/60 text-center">All {playerCount} players will be permanently removed.</p>
          <div className="flex gap-2">
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirming(false) }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/80"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ScoutAIBar() {
  const [value, setValue] = useState('')
  const router = useRouter()

  function submit() {
    const q = value.trim()
    if (!q) { router.push('/scout-search'); return }
    router.push(`/scout-search?q=${encodeURIComponent(q)}`)
  }

  return (
    <div
      className="relative flex items-center gap-2 rounded-xl px-3 py-2 mb-8"
      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
    >
      {/* AI icon */}
      <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-faint)' }} viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 3C9.23 3 6.19 5.95 6 9.66L4.08 12.19C3.84 12.5 4.08 13 4.5 13H6v3c0 1.1.9 2 2 2h1v3h7v-4.68C18.62 15.38 20 13.38 20 11c0-4.42-3.58-8-7-8zm.08 9.41l-.93-1.57c-.14-.23-.42-.3-.65-.15-.22.14-.29.42-.15.65l.92 1.56C11.8 13.3 11.4 14 11.4 14h1.2c0-.11-.03-.22-.08-.31l-.42-.71.98.41V13h-1v-.59zM11 10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
      </svg>

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Scout AI — describe the player you are looking for"
        className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
        style={{ color: 'var(--text-primary)' }}
      />

      {/* Submit — appears when typing */}
      {value.trim() && (
        <button
          onClick={submit}
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--input-border)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#00c896'; e.currentTarget.style.color = '#00c896' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          Search
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center" style={{ background: 'rgba(255,255,255,0.01)' }}>
      <p className="text-white/30 text-sm">{message}</p>
    </div>
  )
}
