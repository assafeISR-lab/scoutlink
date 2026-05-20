'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface ExtractedFilters {
  position?: string | null
  ageMin?: number | null
  ageMax?: number | null
  nationality?: string | null
  preferredFoot?: string | null
  marketValueMin?: number | null
  marketValueMax?: number | null
  contractExpiryYearMax?: number | null
  league?: string | null
  club?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMarketValue(v: number | null): string {
  if (!v) return '—'
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`
  return `€${v}`
}

function scoreColor(score: number): string {
  if (score >= 80) return '#00c896'
  if (score >= 60) return '#fbbf24'
  return '#f87171'
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function PlayerAvatar({ player }: { player: PlayerResult }) {
  const [failed, setFailed] = useState(false)
  if (player.photo && !failed) {
    return (
      <img
        src={player.photo}
        alt=""
        referrerPolicy="no-referrer"
        className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center text-base font-bold text-black flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}
    >
      {player.firstName[0]}{player.lastName[0]}
    </div>
  )
}

// ─── Filter Chips ─────────────────────────────────────────────────────────────

function FilterChips({ filters }: { filters: ExtractedFilters }) {
  const chips: string[] = []
  if (filters.position) chips.push(`Position: ${filters.position}`)
  if (filters.ageMin != null && filters.ageMax != null) chips.push(`Age: ${filters.ageMin}–${filters.ageMax}`)
  else if (filters.ageMin != null) chips.push(`Age ≥ ${filters.ageMin}`)
  else if (filters.ageMax != null) chips.push(`Age ≤ ${filters.ageMax}`)
  if (filters.nationality) chips.push(`Nationality: ${filters.nationality}`)
  if (filters.preferredFoot) chips.push(`Foot: ${filters.preferredFoot}`)
  if (filters.league) chips.push(`League: ${filters.league}`)
  if (filters.club) chips.push(`Club: ${filters.club}`)
  if (filters.contractExpiryYearMax != null) chips.push(`Contract expires ≤ ${filters.contractExpiryYearMax}`)
  if (filters.marketValueMin != null || filters.marketValueMax != null) {
    const lo = filters.marketValueMin ? fmtMarketValue(filters.marketValueMin) : '—'
    const hi = filters.marketValueMax ? fmtMarketValue(filters.marketValueMax) : '—'
    chips.push(`Value: ${lo} – ${hi}`)
  }
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Filters extracted:</span>
      {chips.map(chip => (
        <span key={chip} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,200,150,0.08)', color: '#00c896', border: '1px solid rgba(0,200,150,0.2)' }}>
          {chip}
        </span>
      ))}
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ result, rank }: { result: SearchResult; rank: number }) {
  const { player, score, explanation } = result
  const color = scoreColor(score)

  return (
    <div
      className="rounded-2xl border border-white/5 p-5 flex gap-4 transition-all"
      style={{ background: 'var(--card-bg)' }}
    >
      {/* Rank badge */}
      <div className="flex-shrink-0 w-7 flex items-start justify-center pt-0.5">
        <span className="text-sm font-bold" style={{ color: rank <= 3 ? color : 'rgba(255,255,255,0.2)' }}>
          #{rank}
        </span>
      </div>

      {/* Avatar */}
      <PlayerAvatar player={player} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/databases/${player.databaseId}/players/${player.id}`}
              className="text-base font-semibold text-white hover:text-[#00c896] transition-colors truncate block"
            >
              {player.firstName} {player.lastName}
            </Link>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {player.position && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#00c89615', color: '#00c896', border: '1px solid #00c89630' }}>
                  {player.position}
                </span>
              )}
              {player.clubName && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{player.clubName}</span>}
              {player.nationality && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{player.nationality}</span>}
              {player.age && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{player.age}y</span>}
              {player.heightCm && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{player.heightCm}cm</span>}
              {player.marketValue && <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{fmtMarketValue(player.marketValue)}</span>}
            </div>
          </div>

          {/* Score */}
          <div className="flex-shrink-0 text-center">
            <div className="text-2xl font-bold tabular-nums" style={{ color }}>{score}</div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>match</div>
          </div>
        </div>

        {/* Explanation */}
        <p className="mt-2.5 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {explanation}
        </p>

        {/* List badge */}
        <div className="mt-2.5 flex items-center gap-2">
          <Link
            href="/databases"
            className="text-xs px-2.5 py-1 rounded-full transition-colors"
            style={{ background: 'rgba(108,143,255,0.1)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.2)' }}
          >
            {player.databaseName}
          </Link>
          {player.foot && (
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {player.foot} foot
            </span>
          )}
          {player.league && (
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {player.league}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Loading Steps ────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Extracting filters from your description…', sub: 'Understanding what you need' },
  { label: 'Searching your player lists…', sub: 'Querying the database' },
  { label: 'AI is ranking the best matches…', sub: 'Scoring and selecting top 10' },
]

function LoadingState({ step }: { step: number }) {
  return (
    <div className="rounded-2xl border border-white/5 p-8" style={{ background: 'var(--card-bg)' }}>
      <div className="flex flex-col gap-4">
        {STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          return (
            <div key={i} className="flex items-center gap-4">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: done ? 'rgba(0,200,150,0.15)' : active ? 'rgba(108,143,255,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${done ? 'rgba(0,200,150,0.4)' : active ? 'rgba(108,143,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                {done
                  ? <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#00c896"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  : active
                  ? <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#6c8fff' }} />
                  : <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
                }
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: done ? 'rgba(255,255,255,0.5)' : active ? 'white' : 'rgba(255,255,255,0.25)' }}>{s.label}</p>
                {active && <p className="text-xs mt-0.5" style={{ color: 'rgba(108,143,255,0.7)' }}>{s.sub}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScoutSearchClient() {
  const searchParams = useSearchParams()
  const [message, setMessage] = useState(() => searchParams.get('q') ?? '')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)

  // Auto-search when arriving with ?q= from the inline bar
  useEffect(() => {
    const q = searchParams.get('q')
    if (q?.trim()) handleSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [filters, setFilters] = useState<ExtractedFilters | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    if (!message.trim() || loading) return
    setLoading(true)
    setError(null)
    setResults(null)
    setFilters(null)
    setLoadingStep(0)

    // Simulate progress steps (actual steps happen server-side)
    const stepTimer1 = setTimeout(() => setLoadingStep(1), 3000)
    const stepTimer2 = setTimeout(() => setLoadingStep(2), 6000)

    try {
      const res = await fetch('/api/scout-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Search failed')
      }

      const data = await res.json()
      setResults(data.results ?? [])
      setFilters(data.filters ?? null)
    } catch (e) {
      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Input card */}
      <div className="rounded-2xl border border-white/5 p-6" style={{ background: 'var(--card-bg)' }}>
        <label className="block text-sm font-medium text-white mb-3">
          Describe the player you&apos;re looking for
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          disabled={loading}
          rows={5}
          placeholder="e.g. Looking for a left-footed central midfielder, 22–26 years old, Spanish or South American, strong in possession, contract expiring within the next year, market value under €5M..."
          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 resize-none focus:outline-none transition-all disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          onFocus={e => { e.currentTarget.style.border = '1px solid rgba(0,200,150,0.35)' }}
          onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)' }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSearch() }}
        />
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {message.trim() ? `${message.length} chars · ` : ''}Cmd+Enter to search
          </p>
          <button
            onClick={handleSearch}
            disabled={!message.trim() || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#000' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8l6 4-6 4z"/>
            </svg>
            Find Players
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && <LoadingState step={loadingStep} />}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 px-5 py-4" style={{ background: 'rgba(239,68,68,0.06)' }}>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Filters extracted */}
      {!loading && filters && <FilterChips filters={filters} />}

      {/* Results */}
      {!loading && results !== null && (
        results.length === 0 ? (
          <div className="rounded-2xl border border-white/5 px-6 py-12 text-center" style={{ background: 'var(--card-bg)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No matching players found in your lists.</p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>Try broadening your description or adding more players to your lists.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-widest px-1" style={{ color: 'var(--text-muted)' }}>
              <strong style={{ color: '#00c896' }}>{results.length}</strong> best match{results.length !== 1 ? 'es' : ''} found
            </p>
            {results.map((result, i) => (
              <ResultCard key={result.player.id} result={result} rank={i + 1} />
            ))}
          </div>
        )
      )}
    </div>
  )
}
