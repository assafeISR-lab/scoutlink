'use client'

import { useState } from 'react'
import Link from 'next/link'

interface PlayerResult {
  id: string
  databaseId: string
  databaseName: string
  firstName: string
  lastName: string
  position: string | null
  clubName: string | null
  nationality: string | null
  age: number | null
  heightCm: number | null
  marketValue: number | null
  photo: string
  foot: string
  league: string
}

interface SearchResult {
  score: number
  explanation: string
  player: PlayerResult
}

function fmtValue(v: number | null): string {
  if (!v) return ''
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`
  return `€${v}`
}

function scoreColor(s: number) {
  if (s >= 80) return '#00c896'
  if (s >= 60) return '#fbbf24'
  return '#f87171'
}

function Avatar({ player }: { player: PlayerResult }) {
  const [failed, setFailed] = useState(false)
  if (player.photo && !failed) {
    return (
      <img src={player.photo} alt="" referrerPolicy="no-referrer"
        className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
        onError={() => setFailed(true)} />
    )
  }
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-black flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
      {player.firstName[0]}{player.lastName[0]}
    </div>
  )
}

function ResultRow({ result, rank }: { result: SearchResult; rank: number }) {
  const { player, score, explanation } = result
  const color = scoreColor(score)
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-xs font-bold w-5 pt-2.5 text-right tabular-nums flex-shrink-0"
        style={{ color: rank <= 3 ? color : 'var(--text-faint)' }}>
        #{rank}
      </span>
      <Avatar player={player} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/databases/${player.databaseId}/players/${player.id}`}
            className="text-sm font-semibold truncate transition-colors hover:text-[#00c896]"
            style={{ color: 'var(--text-primary)' }}>
            {player.firstName} {player.lastName}
          </Link>
          <div className="flex-shrink-0">
            <span className="text-base font-bold tabular-nums" style={{ color }}>{score}</span>
            <span className="text-[10px] ml-0.5" style={{ color: 'var(--text-faint)' }}>/100</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
          {player.position && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: '#00c89615', color: '#00c896', border: '1px solid #00c89630' }}>
              {player.position}
            </span>
          )}
          {player.clubName && <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{player.clubName}</span>}
          {player.nationality && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{player.nationality}</span>}
          {player.age != null && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{player.age}y</span>}
          {player.heightCm && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{player.heightCm}cm</span>}
          {player.foot && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{player.foot} foot</span>}
          {player.marketValue ? <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{fmtValue(player.marketValue)}</span> : null}
        </div>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{explanation}</p>
      </div>
    </div>
  )
}

export default function ListAISearch({ databaseId }: { databaseId: string }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    if (!query.trim() || loading) return
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const res = await fetch('/api/scout-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, databaseId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Search failed')
      }
      const data = await res.json()
      setResults(data.results ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  function clear() {
    setQuery('')
    setResults(null)
    setError(null)
  }

  const hasOutput = results !== null || !!error

  return (
    <div className="mb-6">
      {/* Search bar */}
      <div className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>

        {/* AI star icon */}
        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="#00c896">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
        </svg>

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Scout AI — search within this list"
          className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
          style={{ color: 'var(--text-primary)' }}
        />

        {loading && (
          <div className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0"
            style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} />
        )}

        {hasOutput && !loading && (
          <button onClick={clear} className="text-xs flex-shrink-0 transition-colors px-1"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-faint)' }}>
            Clear ✕
          </button>
        )}

        {query.trim() && !loading && (
          <button onClick={handleSearch}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.25)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,200,150,0.2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,200,150,0.12)' }}>
            Search
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Results panel */}
      {hasOutput && (
        <div className="mt-2 rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          {error && (
            <div className="px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {results !== null && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No matching players found in this list.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>Try a different description or broader criteria.</p>
            </div>
          )}

          {results !== null && results.length > 0 && (
            <>
              <div className="px-4 py-2 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: '#00c896' }}>{results.length}</strong> AI match{results.length !== 1 ? 'es' : ''} in this list
                </p>
              </div>
              {results.map((r, i) => (
                <ResultRow key={r.player.id} result={r} rank={i + 1} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
