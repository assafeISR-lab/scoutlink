'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import WebsitesManager from '../settings/WebsitesManager'

interface PlayerResult {
  id: string
  name: string
  nationality: string | null
  team: string | null
  position: string | null
  dateOfBirth: string | null
  heightCm: number | null
  weightKg: number | null
  photo: string | null
  description: string | null
  sourceUrl: string
  sourceName: string
}

interface Database {
  id: string
  name: string
}

interface Website {
  id: string
  name: string
  url: string
  requiresLogin: boolean
  loginStatus: string
  username: string | null
  password: string | null
  isActive: boolean
  useForSearch: boolean
  country: string | null
  category: string | null
}

export default function SearchClient({ databases, websites }: { databases: Database[]; websites: Website[] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlayerResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [noSitesSelected, setNoSitesSelected] = useState(false)
  const [importing, setImporting] = useState<PlayerResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setNoSitesSelected(false)
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    setResults(data.players || [])
    setNoSitesSelected(!!data.noSitesSelected)
    setLoading(false)
  }

  return (
    <div>
    <div className="max-w-5xl">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <div className="flex-1 relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for a player (e.g. Messi, Ronaldo, Mbappe...)"
            className="w-full pl-12 pr-4 py-4 rounded-2xl text-white placeholder-white/20 text-base focus:outline-none transition-colors"
            style={{ background: '#141720', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-8 py-4 rounded-2xl font-semibold text-black text-base disabled:opacity-50 transition-all"
          style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-[#00c896] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-white/30 text-sm">Searching player database...</p>
        </div>
      )}

      {/* No sites selected */}
      {!loading && searched && noSitesSelected && (
        <div className="rounded-2xl border border-dashed p-16 text-center" style={{ borderColor: 'rgba(255,159,67,0.3)', background: 'rgba(255,159,67,0.03)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,159,67,0.1)', border: '1px solid rgba(255,159,67,0.25)' }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ff9f43"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: '#ff9f43' }}>No scouting sites selected</p>
          <p className="text-white/30 text-xs">Check the boxes next to the sites you want to search in below</p>
        </div>
      )}

      {/* No results */}
      {!loading && searched && !noSitesSelected && results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center">
          <p className="text-white/40 text-sm mb-1">No players found for "{query}"</p>
          <p className="text-white/20 text-xs">Try a different name or check the spelling</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !searched && (
        <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <p className="text-white/40 text-sm mb-1">Search for any football player</p>
          <p className="text-white/20 text-xs">Type a player name above to find their stats and profile</p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-4">{results.length} player{results.length !== 1 ? 's' : ''} found</p>
          <div className="flex flex-col gap-4">
            {results.map(player => (
              <PlayerCard key={player.id} player={player} onImport={() => setImporting(player)} />
            ))}
          </div>
        </div>
      )}

      {/* Import modal */}
      {importing && (
        <ImportModal
          player={importing}
          databases={databases}
          onClose={() => setImporting(null)}
        />
      )}
    </div>

    {/* Scouting Websites — full width */}
    <div className="mt-10">
      <p className="text-[10px] text-white/20 uppercase tracking-widest mb-3 px-1">Scouting Websites</p>
      <WebsitesManager websites={websites} />
    </div>
    </div>
  )
}

function PlayerCard({ player, onImport }: { player: PlayerResult; onImport: () => void }) {
  const [expanded, setExpanded] = useState(false)

  const age = player.dateOfBirth
    ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div className="rounded-2xl border border-white/5 overflow-hidden transition-all" style={{
      background: 'linear-gradient(135deg, #141720 0%, #111318 100%)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    }}>
      <div className="flex items-center gap-5 p-5">
        {/* Photo */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {player.photo ? (
            <img src={player.photo} alt={player.name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
          ) : (
            <span className="text-2xl font-bold text-white/20">{player.name[0]}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white mb-1">{player.name}</h3>
          <div className="flex items-center gap-3 flex-wrap">
            {player.team && <span className="text-sm text-white/50">{player.team}</span>}
            {player.position && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#00c89615', color: '#00c896', border: '1px solid #00c89630' }}>
                {player.position}
              </span>
            )}
            {player.nationality && <span className="text-sm text-white/40">{player.nationality}</span>}
          </div>
          <div className="flex items-center gap-4 mt-2">
            {age && <Stat label="Age" value={`${age}`} />}
            {player.heightCm && <Stat label="Height" value={`${player.heightCm} cm`} />}
            {player.weightKg && <Stat label="Weight" value={`${player.weightKg} kg`} />}
            {player.dateOfBirth && <Stat label="Born" value={new Date(player.dateOfBirth).toLocaleDateString()} />}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-white/50">Source:</span>
            <a href={player.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:text-[#00c896] transition-colors underline underline-offset-2" style={{ color: '#00c896aa' }}>{player.sourceName} ↗</a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={onImport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-black"
            style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Import
          </button>
          {player.description && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-xs text-white/30 hover:text-white/60 transition-colors text-center"
            >
              {expanded ? 'Less ↑' : 'More ↓'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded description */}
      {expanded && player.description && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4">
          <p className="text-sm text-white/50 leading-relaxed line-clamp-4">{player.description}</p>
          <a href={player.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs mt-2 inline-block" style={{ color: '#00c896' }}>
            View full profile →
          </a>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-white/40 uppercase tracking-wide font-medium">{label}:</span>
      <span className="text-xs text-white/80 font-semibold">{value}</span>
    </div>
  )
}

function ImportModal({ player, databases, onClose }: { player: PlayerResult; databases: Database[]; onClose: () => void }) {
  const [selectedDb, setSelectedDb] = useState(databases[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const age = player.dateOfBirth
    ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  async function handleImport() {
    if (!selectedDb) return
    setLoading(true)
    setError('')

    const nameParts = player.name.trim().split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || '-'

    const res = await fetch(`/api/databases/${selectedDb}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        lastName,
        nationality: player.nationality,
        clubName: player.team,
        position: player.position,
        dateOfBirth: player.dateOfBirth,
        heightCm: player.heightCm,
        weightKg: player.weightKg,
        sourceName: 'TheSportsDB',
        sourceUrl: player.sourceUrl,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/databases/${selectedDb}/players/${data.id}`)
    } else {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 border border-white/10" style={{ background: '#141720' }} onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-1">Import Player</h2>
        <p className="text-sm text-white/30 mb-5">Choose which database to import into</p>

        {/* Player summary */}
        <div className="flex items-center gap-3 p-3 rounded-xl mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {player.photo && (
            <img src={player.photo} alt={player.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" onError={e => { e.currentTarget.style.display = 'none' }} />
          )}
          <div>
            <p className="text-sm font-semibold text-white">{player.name}</p>
            <p className="text-xs text-white/40">{[player.team, player.nationality, age ? `${age} yrs` : null].filter(Boolean).join(' · ')}</p>
          </div>
        </div>

        {/* Database selector */}
        {databases.length === 0 ? (
          <p className="text-sm text-red-400 mb-4">You have no databases. Create one first.</p>
        ) : (
          <div className="flex flex-col gap-2 mb-5">
            {databases.map(db => (
              <label key={db.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all" style={{
                background: selectedDb === db.id ? 'rgba(0,200,150,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedDb === db.id ? 'rgba(0,200,150,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}>
                <input type="radio" name="database" value={db.id} checked={selectedDb === db.id} onChange={() => setSelectedDb(db.id)} className="accent-[#00c896]" />
                <span className="text-sm text-white">{db.name}</span>
              </label>
            ))}
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70" style={{ background: 'rgba(255,255,255,0.05)' }}>
            Cancel
          </button>
          <button onClick={handleImport} disabled={loading || !selectedDb || databases.length === 0} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
            {loading ? 'Importing...' : 'Import Player'}
          </button>
        </div>
      </div>
    </div>
  )
}
