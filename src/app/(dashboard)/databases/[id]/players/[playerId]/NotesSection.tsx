'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Note {
  id: string
  content: string
  createdAt: Date
  agent: { id: string; fullName: string }
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years !== 1 ? 's' : ''} ago`
}

export default function NotesSection({ notes, currentUserId, databaseId, playerId, canWrite }: {
  notes: Note[]
  currentUserId: string
  databaseId: string
  playerId: string
  canWrite: boolean
}) {
  const [view, setView] = useState<'notes' | 'timeline'>('notes')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    await fetch(`/api/databases/${databaseId}/players/${playerId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    setContent('')
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="rounded-2xl border border-white/5 p-5" style={{
      background: 'linear-gradient(135deg, #141720 0%, #111318 100%)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    }}>
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Scout Notes</h2>
        {notes.length > 0 && (
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setView('notes')}
              className="px-3 py-1 text-xs font-medium transition-all"
              style={view === 'notes'
                ? { background: '#00c896', color: '#000' }
                : { background: 'transparent', color: 'rgba(255,255,255,0.35)' }}
            >
              List
            </button>
            <button
              onClick={() => setView('timeline')}
              className="px-3 py-1 text-xs font-medium transition-all"
              style={view === 'timeline'
                ? { background: '#00c896', color: '#000' }
                : { background: 'transparent', color: 'rgba(255,255,255,0.35)' }}
            >
              Timeline
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {notes.length === 0 && (
        <p className="text-sm text-white/20 mb-4">No notes yet.</p>
      )}

      {/* List view */}
      {view === 'notes' && notes.length > 0 && (
        <div className="space-y-3 mb-4">
          {notes.map(note => (
            <NoteItem key={note.id} note={note} isOwn={note.agent.id === currentUserId} />
          ))}
        </div>
      )}

      {/* Timeline view */}
      {view === 'timeline' && notes.length > 0 && (
        <div className="relative mb-4">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: 'linear-gradient(180deg, #00c896, rgba(0,200,150,0.1))' }} />

          <div className="space-y-6 pl-6">
            {[...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((note, i) => (
              <div key={note.id} className="relative">
                {/* Dot */}
                <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                  style={{ background: i === 0 ? '#00c896' : '#1a1d27', borderColor: '#00c896', boxShadow: i === 0 ? '0 0 8px rgba(0,200,150,0.5)' : 'none' }} />

                {/* Time label */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold" style={{ color: i === 0 ? '#00c896' : 'rgba(255,255,255,0.35)' }}>
                    {timeAgo(note.createdAt)}
                  </span>
                  <span className="text-[10px] text-white/20">
                    {new Date(note.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                {/* Note card */}
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: i === 0 ? '1px solid rgba(0,200,150,0.15)' : '1px solid rgba(255,255,255,0.04)' }}>
                  <p className="text-sm text-white/70 leading-relaxed">{note.content}</p>
                  <p className="text-[10px] text-white/20 mt-2">{note.agent.fullName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add note form */}
      {canWrite && (
        <form onSubmit={handleAddNote} className="flex flex-col gap-2 pt-3 border-t border-white/5">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Add a scouting note..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none resize-none"
            style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)' }}
            onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="self-end px-4 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}
          >
            {loading ? 'Saving...' : 'Add Note'}
          </button>
        </form>
      )}
    </div>
  )
}

function NoteItem({ note, isOwn }: { note: Note; isOwn: boolean }) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(note.content)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSave() {
    if (!content.trim() || content === note.content) { setEditing(false); return }
    setLoading(true)
    await fetch(`/api/notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    setLoading(false)
    setEditing(false)
    router.refresh()
  }

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/notes/${note.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="rounded-xl p-3 group" style={{ background: 'rgba(255,255,255,0.03)' }}>
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            autoFocus
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm text-white resize-none focus:outline-none"
            style={{ background: '#0f1117', border: '1px solid #00c896' }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setEditing(false); setContent(note.content) }} className="px-3 py-1 rounded-lg text-xs text-white/40 hover:text-white/70">Cancel</button>
            <button onClick={handleSave} disabled={loading || !content.trim()} className="px-3 py-1 rounded-lg text-xs font-semibold text-black disabled:opacity-50" style={{ background: '#00c896' }}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-white/70">{note.content}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-white/25">{note.agent.fullName} · {new Date(note.createdAt).toLocaleDateString()}</p>
            {isOwn && (
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditing(true)} className="text-xs text-white/30 hover:text-[#00c896] transition-colors">Edit</button>
                <button onClick={handleDelete} disabled={loading} className="text-xs text-white/30 hover:text-red-400 transition-colors">Delete</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
