'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddNoteForm({ databaseId, playerId }: { databaseId: string; playerId: string }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch(`/api/databases/${databaseId}/players/${playerId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })

    if (res.ok) {
      setContent('')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Add a scouting note..."
        rows={3}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none resize-none transition-colors"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
        onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="self-end px-4 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}
      >
        {loading ? 'Saving...' : 'Add Note'}
      </button>
    </form>
  )
}
