'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Note {
  id: string
  content: string
  createdAt: Date
  agent: { id: string; fullName: string }
}

export default function NotesList({ notes, currentUserId }: { notes: Note[]; currentUserId: string }) {
  return (
    <div className="space-y-3">
      {notes.map(note => (
        <NoteItem key={note.id} note={note} isOwn={note.agent.id === currentUserId} />
      ))}
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
            <button onClick={() => { setEditing(false); setContent(note.content) }} className="px-3 py-1 rounded-lg text-xs text-white/40 hover:text-white/70">
              Cancel
            </button>
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
